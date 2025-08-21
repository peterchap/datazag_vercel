import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/drizzle';
import { users, transactions, creditBundles } from '@/shared/schema';
import { eq } from 'drizzle-orm';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id ? parseInt(String((session!.user as any).id), 10) : undefined;
  if (!userId) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  const orderId = params.id;

  // In a real integration, verify/capture with PayPal using orderId.
  // Here we accept it and credit user based on provided bundle in body (defensive checks included).
  const body = await req.json().catch(() => ({}));
  const { bundleId } = body || {};
  if (!bundleId) return NextResponse.json({ message: 'Missing bundleId' }, { status: 400 });

  const [bundle] = await db.select().from(creditBundles).where(eq(creditBundles.id, bundleId)).limit(1);
  if (!bundle) return NextResponse.json({ message: 'Bundle not found' }, { status: 404 });

  // Update user's credits and write a transaction record
  const [u] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!u) return NextResponse.json({ message: 'User not found' }, { status: 404 });

  const newCredits = (u.credits ?? 0) + (bundle.credits ?? 0);
  await db.update(users).set({ credits: newCredits }).where(eq(users.id, userId));
  // Insert success transaction (idempotency should be handled in real integration)
  await db.insert(transactions).values({
    userId,
    type: 'purchase',
    amount: bundle.credits,
    description: `PayPal order ${orderId} - ${bundle.name}`,
    apiKeyId: null,
    status: 'success',
    metadata: { provider: 'paypal', orderId, price: bundle.price, bundleId: bundle.id },
  } as any);

  return NextResponse.json({ success: true, added: bundle.credits, newTotal: newCredits });
}
