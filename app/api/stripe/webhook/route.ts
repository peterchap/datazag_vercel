import { headers } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { pool } from '@/lib/db';
import { PriceToPlan, type PlanSlug } from '@/lib/planConfig';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  if (!stripe) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 });
  }
  
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
  if (!stripe) return;
  const sub = await stripe.subscriptions.retrieve(subscriptionId, { expand: ['items.data.price'] });
  await syncSubscription(userId, sub);
}

function pickPlanFromStripe(sub: any): PlanSlug | null {
  const items = sub?.items?.data || [];
  const priceId: string | undefined = items[0]?.price?.id;
  if (!priceId) return null;
  const plan = PriceToPlan[priceId];
  return plan || null;
}

async function syncSubscription(userId: string, sub: any) {
  const plan = sub.status === 'canceled' || sub.status === 'incomplete_expired'
    ? 'community'
    : pickPlanFromStripe(sub) || 'community';

  const client = await pool.connect();
  try {
    await client.query(
      `UPDATE users
         SET stripe_subscription_id = $1,
             subscription_status = $2,
             subscription_price_id = $3,
             subscription_current_period_end = to_timestamp($4),
             plan_slug = $5,
             updated_at = NOW()
       WHERE id = $6`,
      [
        sub.id || null,
        sub.status || null,
        sub.items?.data?.[0]?.price?.id ?? null,
        sub.current_period_end ?? null,
        plan,
        userId,
      ]
    );
  } finally {
    client.release();
  }
}