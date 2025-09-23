import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/drizzle';
import { users, transactions } from '@/shared/schema';
import { eq, sql } from 'drizzle-orm';
import Stripe from 'stripe';
import { Resend } from 'resend';
import { redisSyncService } from '@/lib/redis-sync-client';
import { nanoid } from 'nanoid';

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET_CREDITS;

export async function POST(req: NextRequest) {
  if (!stripe || !webhookSecret) {
    return NextResponse.json({ error: 'Stripe is not configured.' }, { status: 500 });
  }

  try {
    const rawBody = await req.text();
    const signature = req.headers.get('stripe-signature') as string;

    // 1. Verify the event is genuinely from Stripe
    const event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const meta = session.metadata || {};
      const userId = meta.userId; // Keep as string - don't convert to number
      const creditsToAdd = Number(meta.credits);
      const amountPaid = Number(meta.amountPaid);

      if (userId && creditsToAdd > 0) {
        // 2. Use a Drizzle transaction for data integrity
        try {
          await db.transaction(async (tx) => {
            // 1. Update the user's credits
            await tx
              .update(users)
              .set({
                // 👇 CORRECTED LINE
                credits: sql`${users.credits} + ${creditsToAdd}`,
              })
              .where(eq(users.id, userId));

            // 2. Record the successful transaction
            await tx.insert(transactions).values({
              id: session.id,
              user_id: userId,
              stripeChargeId: typeof session.payment_intent === 'string' ? session.payment_intent : null,
              amount: amountPaid / 100,
              credits: creditsToAdd,
              status: 'completed',
              provider: 'stripe',
            });
          });
          console.log(`[Stripe Webhook] Successfully processed credits for user: ${userId}`);
        } catch (error) {
          console.error('[Stripe Webhook] Error processing transaction:', error);
          return NextResponse.json({ error: 'Failed to process transaction.' }, { status: 500 });
        }
            
            // 3. Updated Redis sync call
            const user = updatedUsers[0];
            try {
              await redisSyncService.updateUserCredits(userId, user.credits);
              console.log(`[Redis Sync] Successfully updated credits for user ${userId} after purchase`);
            } catch (redisError) {
              console.error(`[Redis Sync Error] Failed to update credits for user ${userId}:`, redisError);
            }

            // Send confirmation email
            if (resend && user.email) {
                try {
                  await resend.emails.send({
                      from: process.env.EMAIL_FROM || 'noreply@datazag.com',
                      to: user.email,
                      subject: 'Your Datazag Credit Purchase Confirmation',
                      html: `<h1>Thank you, ${user.firstName}!</h1><p>We've added <strong>${creditsToAdd.toLocaleString()} credits</strong> to your account.</p>`,
                  });
                  console.log(`[Email] Sent purchase confirmation to ${user.email}`);
                } catch (emailError) {
                  console.error(`[Email Error] Failed to send confirmation to ${user.email}:`, emailError);
                }
            }
        });
      }
    }
    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error('Stripe webhook error:', err);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }
}
