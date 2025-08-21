import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/drizzle';
import { users, transactions, creditBundles } from '@/shared/schema';
import { eq } from 'drizzle-orm';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id ? parseInt(String((session!.user as any).id), 10) : undefined;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { bundleId } = body || {};
  if (!bundleId) return NextResponse.json({ error: 'Missing bundleId' }, { status: 400 });

  const [bundle] = await db.select().from(creditBundles).where(eq(creditBundles.id, bundleId)).limit(1);
  if (!bundle) return NextResponse.json({ error: 'Bundle not found' }, { status: 404 });
  const [u] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!u) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const newCredits = (u.credits ?? 0) + (bundle.credits ?? 0);
  await db.update(users).set({ credits: newCredits }).where(eq(users.id, userId));
  await db.insert(transactions).values({
    userId,
    type: 'purchase',
    amount: bundle.credits,
    description: `Stripe purchase - ${bundle.name}`,
    apiKeyId: null,
    status: 'success',
    metadata: { provider: 'stripe', price: bundle.price },
  } as any);

  return NextResponse.json({ success: true, creditsAdded: bundle.credits, newTotal: newCredits });
}
