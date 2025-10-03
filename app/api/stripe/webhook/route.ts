import { NextResponse, type NextRequest } from 'next/server';
import {headers} from 'next/headers';
import { db } from '@/lib/drizzle';
import { users, transactions } from '@/shared/schema';
import { eq, sql } from 'drizzle-orm';
import Stripe from 'stripe';
import { Resend } from 'resend';
import { redisSyncService } from '@/lib/redis-sync-client';
import crypto from 'crypto';



export const runtime = 'nodejs'; // Ensure the route is treated as a Node.js function
export const dynamic = 'force-dynamic';


const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export async function POST(req: NextRequest) {
  console.log('[Webhook] Handler started.');
  let event: Stripe.Event;
  const headersList = headers();
  const resendFlag = headersList.get('x-resend') || 'false';
  const resendInstance = resendFlag === 'true' && resend ? resend : null;
  
  if (!stripe) {
    console.error('[Webhook] Stripe not configured.');
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 });
  }

 // 1) Get the raw body *exactly* as sent by Stripe
  const ab = await req.arrayBuffer();
  const raw = Buffer.from(ab);

  // 2) Get the Stripe signature from the incoming request headers
  const sig = req.headers.get('stripe-signature');
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  console.log('[Webhook] url:', req.nextUrl?.pathname);
  console.log('[Webhook] host:', req.headers.get('host'));
  console.log('[Webhook] sig present:', Boolean(sig));
  console.log('[Webhook] secret tail:', webhookSecret ? webhookSecret.slice(-6) : 'MISSING');
  console.log('[Webhook] content-length:', req.headers.get('content-length'));

  if (!sig) {
    console.error('[Webhook] Missing stripe-signature header');
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  //const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('[Webhook] Missing STRIPE_WEBHOOK_SECRET env var');
    return NextResponse.json({ error: 'Misconfigured webhook secret' }, { status: 500 });
  }

  try {
    // 3) Verify signature against the exact raw body
   try {
    const parts = Object.fromEntries(
      sig.split(',').map(kv => {
        const [k, v] = kv.split('=');
        return [k.trim(), v];
      })
    ) as Record<string, string>;
    const ts = parts['t'];
    const v1 = parts['v1'];

    if (ts && v1) {
      const payloadToSign = `t=${ts}.${raw.toString('utf8')}`;
      const localHmac = crypto.createHmac('sha256', webhookSecret).update(payloadToSign).digest('hex');
      const hmacMatches = crypto.timingSafeEqual(Buffer.from(localHmac), Buffer.from(v1));
      console.log('[Webhook][diag] header.t:', ts);
      console.log('[Webhook][diag] header.v1 (first 12):', v1.slice(0, 12));
      console.log('[Webhook][diag] localHmac (first 12):', localHmac.slice(0, 12));
      console.log('[Webhook][diag] HMAC matches:', hmacMatches);
    } else {
      console.log('[Webhook][diag] Could not parse t/v1 from signature header');
    }
  } catch (e) {
    console.log('[Webhook][diag] HMAC self-check failed:', e);
  }

    // Verify the event using Stripe's library
    try {
    event = stripe.webhooks.constructEvent(raw, sig, webhookSecret);
    console.log('[Webhook] Signature verified ✅', event.id, event.type);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[Webhook] Signature verification failed ❌', msg);
    return NextResponse.json({ error: `Webhook Error: ${msg}` }, { status: 400 });
  }

  // 4) Handle events
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
      console.log('[Webhook] Processing checkout.session.completed event.');
      console.log('[Webhook] Session ID:', session.id);
      console.log('[Webhook] Payment status:', session.payment_status);

      // Only process if payment is actually completed
      if (session.payment_status !== 'paid') {
        console.log('[Webhook] Payment not completed, skipping processing');
        return NextResponse.json({ received: true });
      }

      const meta = session.metadata || {};
      console.log('[Webhook] Metadata extracted:', meta);

      // Extract and validate metadata fields
      const { 
        userId, 
        credits, 
        amountInBaseCurrencyCents, 
        originalAmount, 
        originalCurrency, 
        exchangeRateAtPurchase 
      } = meta;

      if (!userId) {
        console.error('[Webhook] CRITICAL: Missing userId in metadata.');
        return NextResponse.json({ error: 'Missing userId in metadata.' }, { status: 400 });
      }

      const creditsToAdd = Number(credits);
      if (!creditsToAdd || creditsToAdd <= 0) {
        console.error('[Webhook] CRITICAL: Invalid credits amount.');
        return NextResponse.json({ error: 'Invalid credits amount.' }, { status: 400 });
      }

      console.log(`[Webhook] Processing ${creditsToAdd} credits for user ${userId}`);

      // **PROCESS 1: DATABASE UPDATES**
      let updatedUser: any;
      try {
        console.log('[Webhook] Starting database transaction...');
        
        await db.transaction(async (tx) => {
          // Update user credits
          const updatedUsers = await tx
            .update(users)
            .set({
              credits: sql`${users.credits} + ${creditsToAdd}`,
            })
            .where(eq(users.id, userId))
            .returning();

          if (updatedUsers.length === 0) {
            throw new Error(`User ${userId} not found`);
          }

          updatedUser = updatedUsers[0];
          console.log(`[Webhook] User credits updated. New total: ${updatedUser.credits}`);

          // Record the transaction
          await tx.insert(transactions).values({
            id: session.id,
            userId: userId,
            status: 'completed',
            paymentMethod: 'stripe',
            gatewayCustomerId: typeof session.customer === 'string' ? session.customer : null,
            amountInBaseCurrencyCents: Number(amountInBaseCurrencyCents || 0),
            originalAmount: Number(originalAmount || 0),
            originalCurrency: originalCurrency || 'USD',
            exchangeRateAtPurchase: exchangeRateAtPurchase || '1.0',
            type: 'credits_purchase',
            description: `${creditsToAdd} Credits Purchase`,
            credits: creditsToAdd,
            createdAt: new Date(session.created * 1000),
          });

          console.log('[Webhook] Transaction recorded successfully.');
        });

        console.log(`[Webhook] Database transaction completed successfully for user: ${userId}`);
      } catch (dbError) {
        console.error('[Webhook] Database transaction failed:', dbError);
        return NextResponse.json({ error: 'Failed to process transaction.' }, { status: 500 });
      }

      // **PROCESS 2: REDIS CACHE UPDATES**
      try {
        console.log('[Webhook] Starting Redis sync...');
        await redisSyncService.updateApiKeyCredits(userId, updatedUser.credits);
        console.log(`[Webhook] Redis sync completed successfully for user ${userId}`);
      } catch (redisError) {
        console.error(`[Webhook] Redis sync failed for user ${userId}:`, redisError);
        // Don't fail the webhook for Redis errors - log and continue
      }

      // **PROCESS 3: CONFIRMATION EMAIL**
      if (resendInstance && updatedUser.email) {
        try {
          console.log(`[Webhook] Sending confirmation email to ${updatedUser.email}...`);
          
          const emailResult = await resendInstance!.emails.send({
            from: process.env.EMAIL_FROM || 'noreply@datazag.com',
            to: updatedUser.email,
            subject: 'Your Datazag Credit Purchase Confirmation',
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h1 style="color: #333;">Thank you for your purchase!</h1>
                <p>Hi ${updatedUser.firstName || 'there'},</p>
                <p>We've successfully processed your credit purchase:</p>
                <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <h3 style="margin: 0 0 10px 0; color: #333;">Purchase Details</h3>
                  <p><strong>Credits Added:</strong> ${creditsToAdd.toLocaleString()}</p>
                  <p><strong>Amount Paid:</strong> ${originalCurrency} ${(Number(originalAmount) / 100).toFixed(2)}</p>
                  <p><strong>Transaction ID:</strong> ${session.id}</p>
                  <p><strong>New Credit Balance:</strong> ${updatedUser.credits.toLocaleString()}</p>
                </div>
                <p>You can view your transaction history and download invoices in your <a href="${process.env.NEXT_PUBLIC_APP_URL}/billing">billing dashboard</a>.</p>
                <p>Thank you for choosing Datazag!</p>
              </div>
            `,
          });
          
          console.log(`[Webhook] Confirmation email sent successfully to ${updatedUser.email}. Email ID: ${emailResult.data?.id}`);
        } catch (emailError) {
          console.error(`[Webhook] Failed to send confirmation email to ${updatedUser.email}:`, emailError);
          // Don't fail the webhook for email errors - log and continue
        }
      } else {
        if (!resendInstance) {
          console.log('[Webhook] Resend not configured, skipping email');
        } else {
          console.log('[Webhook] No user email found, skipping confirmation email');
        }
      }

      console.log(`[Webhook] ✅ Successfully completed all processes for user ${userId}`);
      console.log(`[Webhook] Summary: Added ${creditsToAdd} credits, updated Redis, sent email`);
    }

    return NextResponse.json({ received: true });
}
