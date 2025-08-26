import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { db } from '@/lib/drizzle';
import { users, transactions, creditBundles } from '@/shared/schema';
import { eq } from 'drizzle-orm';

// Removed unnecessary top-level import; dynamic import is used inside the POST handler.

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  console.log('Stripe webhook received');
  // Removed unused and incorrect import of redisSyncService.
  const sig = req.headers.get('stripe-signature');
  if (!sig) return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  const body = await req.text();
  let event: any;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET_CREDITS as string);
    console.log('Stripe event type:', event.type);
  } catch (e: any) {
    return NextResponse.json({ error: 'Invalid signature', details: e?.message }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as any;
    const bundleId = parseInt(session.metadata?.bundleId || '0', 10);
    const userId = parseInt(session.metadata?.userId || '0', 10);
    if (bundleId && userId) {
      const [bundle] = await db.select().from(creditBundles).where(eq(creditBundles.id, bundleId)).limit(1);
      const [u] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      if (bundle && u) {
        const newCredits = (u.credits ?? 0) + (bundle.credits ?? 0);
        const updateResult = await db.update(users).set({ credits: newCredits }).where(eq(users.id, userId));
        console.log('DB update credits result:', updateResult);
        console.log('Attempting to insert transaction:', {
          userId,
          type: 'purchase',
          amount: bundle.credits,
          description: `Stripe Checkout ${session.id} - ${bundle.name}`,
          apiKeyId: null,
          status: 'success',
          metadata: { provider: 'stripe', sessionId: session.id, bundleId: bundle.id, price: bundle.price },
        });
        try {
          const insertResult = await db.insert(transactions).values({
            userId,
            type: 'purchase',
            amount: bundle.credits,
            description: `Stripe Checkout ${session.id} - ${bundle.name}`,
            apiKeyId: null,
            status: 'success',
            metadata: { provider: 'stripe', sessionId: session.id, bundleId: bundle.id, price: bundle.price },
          } as any);
          console.log('Transaction insert result:', insertResult);
        } catch (err) {
          console.error('Transaction insert failed:', err);
        }
        // Sync credits to Redis
        try {
          const { redisSyncService } = await import('../../../lib/redis-sync-js');
          const redisResult = await redisSyncService.updateCredits(userId, newCredits);
          console.log(`Redis credits update for user ${userId}:`, redisResult);
        } catch (e) {
          const msg = typeof e === 'object' && e !== null && 'message' in e ? (e as any).message : String(e);
          console.warn('Redis sync failed:', msg);
        }
      }
    }
  }

  return NextResponse.json({ received: true });
}
