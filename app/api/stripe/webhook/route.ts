import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/drizzle';
import { userSubscriptions } from '@/shared/schema'; // Assuming a subscriptions table
import { eq } from 'drizzle-orm';
import Stripe from 'stripe';

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;
// This should be a different secret from your credits webhook for security
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET_SUBSCRIPTIONS;

export async function POST(req: NextRequest) {
  if (!stripe || !webhookSecret) {
    return NextResponse.json({ error: 'Stripe is not configured.' }, { status: 500 });
  }

  try {
    const rawBody = await req.text();
    const signature = req.headers.get('stripe-signature') as string;
    const event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);

    const session = event.data.object as Stripe.Subscription & {
      current_period_start: number;
      current_period_end: number;
    };

    // Handle different subscription events
    switch (event.type) {
      case 'customer.subscription.created':
        // --- THIS IS THE FIX ---
        // We now validate the metadata before using it.
        const userId = Number(session.metadata?.userId);
        if (!userId || isNaN(userId)) {
          console.error(`[Webhook Error] Subscription created event is missing a valid userId in metadata. Session ID: ${session.id}`);
          // We break here to prevent a crash, but in production, you might want to
          // send an alert to your development team.
          break; 
        }
        // --- END OF FIX ---
        
        await db.insert(userSubscriptions).values({
          userId: userId,
          planId: Number(session.items?.data[0]?.plan?.metadata?.planId ?? 0),
          stripeSubscriptionId: session.id,
          status: session.status,
          currentPeriodStart: new Date(session.current_period_start * 1000).toISOString(),
          currentPeriodEnd: new Date(session.current_period_end * 1000).toISOString(),
          interval: session.items?.data[0]?.plan?.interval ?? 'month',
          cancelAtPeriodEnd: session.cancel_at_period_end,
        });
        break;
      case 'customer.subscription.updated':
         await db.update(userSubscriptions)
            .set({ 
                status: session.status, 
                cancelAtPeriodEnd: session.cancel_at_period_end,
                currentPeriodStart: new Date(session.current_period_start * 1000).toISOString(),
                currentPeriodEnd: new Date(session.current_period_end * 1000).toISOString(),
            })
            .where(eq(userSubscriptions.stripeSubscriptionId, session.id));
        break;
      case 'customer.subscription.deleted':
         await db.update(userSubscriptions)
            .set({ status: 'canceled' })
            .where(eq(userSubscriptions.stripeSubscriptionId, session.id));
        break;
      default:
        console.log(`Unhandled Stripe event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error('Stripe webhook error:', err);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }
}