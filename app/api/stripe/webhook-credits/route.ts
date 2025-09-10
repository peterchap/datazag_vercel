import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/drizzle';
import { users, transactions } from '@/shared/schema';
import { eq, sql } from 'drizzle-orm';
import Stripe from 'stripe';
import { Resend } from 'resend';
import { redisSyncService } from '@/lib/redis-sync-client';

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET_CREDITS;

// This is the final, unified webhook handler for one-time credit purchases.
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
      const userId = Number(meta.userId);
      const creditsToAdd = Number(meta.credits);
      const amountPaid = Number(meta.amountPaid);

      if (userId && creditsToAdd > 0) {
        // 2. Use a Drizzle transaction for data integrity
        await db.transaction(async (tx) => {
            const updatedUsers = await tx.update(users)
              .set({ credits: sql`${users.credits} + ${creditsToAdd}` })
              .where(eq(users.id, userId))
              .returning({ credits: users.credits, email: users.email, firstName: users.firstName });

            await tx.insert(transactions).values({
              userId,
              type: 'purchase',
              amount: creditsToAdd,
              description: `Purchased ${meta.bundleName}`,
              status: 'success',
              metadata: { stripeSessionId: session.id, amountPaid, currency: meta.currencyPaid },
            });
            
            // 3. Asynchronously sync with Redis and send email
            const user = updatedUsers[0];
            redisSyncService.updateCredits(userId, user.credits).catch(console.error);

            if (resend && user.email) {
                resend.emails.send({
                    from: process.env.EMAIL_FROM || 'noreply@datazag.com',
                    to: user.email,
                    subject: 'Your Datazag Credit Purchase Confirmation',
                    html: `<h1>Thank you, ${user.firstName}!</h1><p>We've added <strong>${creditsToAdd.toLocaleString()} credits</strong> to your account.</p>`,
                }).catch(console.error);
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
