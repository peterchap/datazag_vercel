import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/drizzle';
import { users, creditBundles, transactions } from '@/shared/schema';
import { eq } from 'drizzle-orm';

// Session-protected order creation for PayPal wrapper
export async function POST(req: NextRequest) {
  if (process.env.PAYPAL_ENABLED !== 'true') {
    return NextResponse.json({ message: 'Not found' }, { status: 404 });
  }
  const session = await getServerSession(authOptions);
  const uid = (session?.user as any)?.id ? parseInt(String((session!.user as any).id), 10) : undefined;
  if (!uid) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  const { bundleId, discountCode, currency, intent } = await req.json().catch(() => ({}));
  if (!bundleId) return NextResponse.json({ message: 'bundleId required' }, { status: 400 });
  const currencyCode = String(currency || 'USD').toUpperCase();
  if (currencyCode !== 'USD') return NextResponse.json({ message: 'Unsupported currency' }, { status: 400 });

  // Verify user can purchase
  const [u] = await db.select().from(users).where(eq(users.id, uid)).limit(1);
  if (!u) return NextResponse.json({ message: 'User not found' }, { status: 404 });
  if ((u as any).canPurchaseCredits === false) return NextResponse.json({ message: 'Purchases disabled for this account' }, { status: 403 });

  // Find bundle and insert pending transaction
  const [bundle] = await db.select().from(creditBundles).where(eq(creditBundles.id as any, bundleId)).limit(1);
  if (!bundle) return NextResponse.json({ message: 'Bundle not found' }, { status: 404 });

  const pseudoId = `ORDER-${Date.now()}-${Math.floor(Math.random()*1e6)}`;
  try {
    await db.insert(transactions).values({
      userId: uid,
      type: 'purchase',
      amount: bundle.credits,
      description: `PayPal order ${pseudoId} (pending) - ${bundle.name}`,
      apiKeyId: null,
      status: 'pending',
      metadata: { provider: 'paypal', orderId: pseudoId, price: bundle.price, bundleId: bundle.id, discountCode, intent },
    } as any);
  } catch {
    await db.insert(transactions).values({
      userId: uid,
      type: 'purchase',
      amount: bundle.credits,
      description: `PayPal order ${pseudoId} (pending) - ${bundle.name}`,
      apiKeyId: null,
      metadata: { provider: 'paypal', orderId: pseudoId, price: bundle.price, bundleId: bundle.id, discountCode, intent },
    } as any);
  }

  return NextResponse.json({ id: pseudoId });
}
