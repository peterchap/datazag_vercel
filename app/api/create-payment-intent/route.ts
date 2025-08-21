import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/drizzle';
import { users, creditBundles } from '@/shared/schema';
import { eq } from 'drizzle-orm';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id ? parseInt(String((session!.user as any).id), 10) : undefined;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { bundleId } = body || {};
  if (!bundleId) return NextResponse.json({ error: 'Missing bundleId' }, { status: 400 });

  // Verify user can purchase and bundle exists
  const [u] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!u) return NextResponse.json({ error: 'User not found' }, { status: 404 });
  if (u.canPurchaseCredits === false) return NextResponse.json({ error: 'Purchases disabled for this account' }, { status: 403 });
  const [bundle] = await db.select().from(creditBundles).where(eq(creditBundles.id, bundleId)).limit(1);
  if (!bundle) return NextResponse.json({ error: 'Bundle not found' }, { status: 404 });

  // For Stripe Checkout redirection, return 200; client will call /api/stripe/checkout-credits
  return NextResponse.json({ ok: true });
}
