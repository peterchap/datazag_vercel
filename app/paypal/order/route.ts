import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db, pool } from '@/lib/drizzle';
import { users, creditBundles, transactions } from '@/shared/schema';
import { eq } from 'drizzle-orm';

// PayPal Web SDK posts here with { amount: string, currency: string, intent: string }
export async function POST(req: NextRequest) {
  if (process.env.PAYPAL_ENABLED !== 'true') {
    return NextResponse.json({ message: 'Not found' }, { status: 404 });
  }
  const session = await getServerSession(authOptions);
  const uid = (session?.user as any)?.id ? parseInt(String((session!.user as any).id), 10) : undefined;
  if (!uid) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const amountStr = String(body?.amount ?? '');
  const currency = String(body?.currency ?? 'USD').toUpperCase();
  if (!amountStr) return NextResponse.json({ message: 'Missing amount' }, { status: 400 });
  if (currency !== 'USD') return NextResponse.json({ message: 'Unsupported currency' }, { status: 400 });

  // Verify user can purchase
  const [u] = await db.select().from(users).where(eq(users.id, uid)).limit(1);
  if (!u) return NextResponse.json({ message: 'User not found' }, { status: 404 });
  if (u.canPurchaseCredits === false) return NextResponse.json({ message: 'Purchases disabled for this account' }, { status: 403 });

  // Parse amount into cents and find matching bundle
  const cents = Math.round(parseFloat(amountStr) * 100);
  if (!Number.isFinite(cents) || cents <= 0) return NextResponse.json({ message: 'Invalid amount' }, { status: 400 });
  const bundles = await db.select().from(creditBundles);
  const bundle = bundles.find(b => (b.price ?? 0) === cents);
  if (!bundle) return NextResponse.json({ message: 'No bundle matches amount' }, { status: 400 });

  const pseudoId = `ORDER-${Date.now()}-${Math.floor(Math.random()*1e6)}`;
  // Insert a pending transaction, handling schemas without a status column
  try {
    await db.insert(transactions).values({
      userId: uid,
      type: 'purchase',
      amount: bundle.credits,
      description: `PayPal order ${pseudoId} (pending) - ${bundle.name}`,
      apiKeyId: null,
      status: 'pending',
      metadata: { provider: 'paypal', orderId: pseudoId, price: bundle.price, bundleId: bundle.id },
    } as any);
  } catch (e: any) {
    // Retry without status column if schema doesn't have it
    await db.insert(transactions).values({
      userId: uid,
      type: 'purchase',
      amount: bundle.credits,
      description: `PayPal order ${pseudoId} (pending) - ${bundle.name}`,
      apiKeyId: null,
      metadata: { provider: 'paypal', orderId: pseudoId, price: bundle.price, bundleId: bundle.id },
    } as any);
  }

  return NextResponse.json({ id: pseudoId });
}
