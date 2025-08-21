import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/drizzle';
import { users, creditBundles, transactions } from '@/shared/schema';
import { eq } from 'drizzle-orm';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id ? parseInt(String((session!.user as any).id), 10) : undefined;
  if (!userId) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { bundleId } = body || {};
  if (!bundleId) return NextResponse.json({ message: 'Missing bundleId' }, { status: 400 });

  // Verify user can purchase
  const [u] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!u) return NextResponse.json({ message: 'User not found' }, { status: 404 });
  if (u.canPurchaseCredits === false) return NextResponse.json({ message: 'Purchases disabled for this account' }, { status: 403 });

  // Validate bundle
  const [bundle] = await db.select().from(creditBundles).where(eq(creditBundles.id, bundleId)).limit(1);
  if (!bundle) return NextResponse.json({ message: 'Bundle not found' }, { status: 404 });

  // Normally we'd call PayPal Orders API here and return the real order id.
  // For now, generate a pseudo order id and store a pending transaction to reconcile on capture.
  const pseudoId = `ORDER-${Date.now()}-${Math.floor(Math.random()*1e6)}`;
  await db.insert(transactions).values({
    userId,
    type: 'purchase',
    amount: bundle.credits,
    description: `PayPal order ${pseudoId} (pending) - ${bundle.name}`,
    apiKeyId: null,
    status: 'pending',
    metadata: { provider: 'paypal', orderId: pseudoId, price: bundle.price, bundleId: bundle.id },
  } as any);

  return NextResponse.json({ id: pseudoId, amount: bundle.price, credits: bundle.credits });
}
