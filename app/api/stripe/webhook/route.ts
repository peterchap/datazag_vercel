import { db } from '@/lib/drizzle';
import { users, transactions } from '@/shared/schema';
import { eq, sql} from 'drizzle-orm';
import Stripe from 'stripe';
import { headers } from 'next/headers';

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;
// This should be a different secret from your credits webhook for security
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(req: Request) {
    const body = await req.text();
    const signature = headers().get('stripe-signature')!;

    if (!stripe || !webhookSecret) {
        console.error('❌ Stripe is not configured properly.');
        return new Response('Stripe not configured', { status: 500 });
    }

    let event: Stripe.Event;

    try {
        event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err: any) {
        console.error(`❌ Webhook signature verification failed: ${err.message}`);
        return new Response(`Webhook Error: ${err.message}`, { status: 400 });
    }
    
    console.log(`[Webhook] 2: Event constructed successfully. Type: ${event.type}`);

    if (event.type === 'checkout.session.completed') {
        console.log('[Webhook] 3: Event type is checkout.session.completed.');
        const session = event.data.object as Stripe.Checkout.Session;
        const meta = session.metadata || {};
        const userId = meta.userId;
        const creditsToAward = Number(meta.credits);
        const amountPaid = Number(meta.amountPaid);
        
        console.log('[Webhook] 4: Metadata extracted:', { userId, creditsToAward, amountPaid });

        if (!userId || isNaN(creditsToAward) || isNaN(amountPaid)) {
            console.error('[Webhook] 5a: Invalid metadata received.', meta);
            return new Response('Invalid metadata in session.', { status: 400 });
        }

        console.log('[Webhook] 5b: Metadata is valid, attempting database transaction.');

        try {
            await db.transaction(async (tx) => {
                console.log('[Webhook] 6: Database transaction block entered.');
                
                await tx
                  .update(users)
                  .set({
                    credits: sql`${users.credits} + ${creditsToAward}`,
                  })
                  .where(eq(users.id, userId));
                
                console.log('[Webhook] 7: User credits updated.');

                await tx.insert(transactions).values({
                  id: session.id,
                    userId: userId,
                    type: 'credits_purchase', // ✅ Missing required field
                    amount: amountPaid,
                    description: `${meta.credits} credits purchase`, // ✅ Missing required field
                    status: 'completed',
                });
                console.log('[Webhook] 8: Transaction recorded.');
            });
            console.log(`[Webhook] 9: Successfully processed credits for user: ${userId}`);
        } catch (error) {
            console.error('[Webhook] CRITICAL: Error processing database transaction:', error);
            return new Response(JSON.stringify({ error: 'Database update failed.' }), { status: 500 });
        }
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 });
}