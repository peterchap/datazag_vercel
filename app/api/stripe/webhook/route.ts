import { headers } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { pool } from '@/lib/db';

export const dynamic = 'force-dynamic'; // ensure no caching

export async function POST(req: NextRequest) {
  const sig = headers().get('stripe-signature');
  const buf = await req.text();

  let event;
  try {
    event = stripe.webhooks.constructEvent(buf, sig!, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err: any) {
    console.error('Webhook signature verification failed', err?.message);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const s = event.data.object as any;
        const userId = s.metadata?.userId || s.subscription_metadata?.userId;
        if (userId && s.subscription) {
          await upsertSubscription(String(userId), String(s.subscription));
        }
        break;
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const sub = event.data.object as any;
        const userId = sub.metadata?.userId;
        if (userId) await syncSubscription(String(userId), sub);
        break;
      }
      default:
        break;
    }
  } catch (e) {
    console.error('Webhook handling error', e);
  }

  return NextResponse.json({ received: true }, { status: 200 });
}

async function upsertSubscription(userId: string, subscriptionId: string) {
  const sub = await stripe.subscriptions.retrieve(subscriptionId);
  await syncSubscription(userId, sub);
}

async function syncSubscription(userId: string, sub: any) {
  const client = await pool.connect();
  try {
    await client.query(
      `UPDATE users
       SET stripe_subscription_id = $1,
           subscription_status = $2,
           subscription_price_id = $3,
           subscription_current_period_end = to_timestamp($4),
           updated_at = NOW()
       WHERE id = $5`,
      [
        sub.id,
        sub.status,
        sub.items?.data?.[0]?.price?.id ?? null,
        sub.current_period_end ?? null,
        userId,
      ]
    );
  } finally {
    client.release();
  }
}