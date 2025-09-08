const express = require('express');
const { pool } = require('../services/db');
const { authenticateToken } = require('../middleware/auth');
const { redisSyncService } = require('../services/redis');
const { Resend } = require('resend');
const Stripe = require('stripe');

const router = express.Router();
const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

/**
 * POST /api/stripe/checkout-credits
 * This is the final version that attaches all necessary metadata.
 */
router.post('/checkout-credits', authenticateToken, async (req, res) => {
  try {
    const { bundleId, currency, amount } = req.body;
    if (!bundleId || !currency || amount === undefined) {
      return res.status(400).json({ error: 'bundleId, currency, and amount are required' });
    }

    const { rows } = await pool.query(
      'SELECT name, description, credits FROM credit_bundles WHERE id = $1',
      [bundleId]
    );
    const bundle = rows[0];
    if (!bundle) return res.status(404).json({ error: 'Credit bundle not found' });
    
    // Logic for free bundles remains the same
    if (amount === 0) {
      const { rows: updateResult } = await pool.query('UPDATE users SET credits = credits + $1 WHERE id = $2 RETURNING credits', [bundle.credits, req.user.id]);
      await pool.query(`INSERT INTO transactions (user_id, type, amount, description, status) VALUES ($1, 'purchase', $2, $3, 'success')`,[req.user.id, bundle.credits, `Claimed free bundle: ${bundle.name}`]);
      redisSyncService.updateCredits(req.user.id, updateResult[0].credits).catch(console.error);
      return res.status(200).json({ freeClaim: true, message: 'Free bundle claimed successfully.' });
    }

    if (!stripe) return res.status(500).json({ error: 'Stripe not configured.' });
    const appBaseUrl = process.env.APP_BASE_URL || 'http://localhost:3001';

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      success_url: `${appBaseUrl}/credits?success=1`,
      cancel_url: `${appBaseUrl}/credits?canceled=1`,
      line_items: [{
        quantity: 1,
        price_data: {
          currency: currency,
          unit_amount: amount,
          product_data: { name: `${bundle.name} Credits` },
        },
      }],
      customer_email: req.user.email,
      metadata: { 
        userId: String(req.user.id), 
        credits: String(bundle.credits), 
        bundleName: bundle.name, 
        amountPaid: String(amount),
        currencyPaid: currency
      },
    });

    return res.status(200).json({ url: session.url });

  } catch (err) {
    console.error('Error creating Stripe checkout session:', err);
    return res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

/**
 * POST /api/stripe/webhook-credits
 * This is the final webhook with the complete database and email logic.
 */
router.post('/webhook-credits', async (req, res) => {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET_CREDITS;
    if (!stripe || !webhookSecret) {
      console.error("[Webhook] Stripe or Webhook Secret is not configured.");
      return res.status(500).json({ error: 'Webhook not configured.' });
    }

    try {
        const event = stripe.webhooks.constructEvent(req.rawBody, req.headers['stripe-signature'], webhookSecret);
        
        console.log(`[Webhook] Received verified event: ${event.type}`);

        if (event.type === 'checkout.session.completed') {
            const session = event.data.object;
            const meta = session.metadata || {};
            
            console.log('[Webhook] Inspecting metadata:', meta);
            
            const userId = Number(meta.userId);
            const creditsToAdd = Number(meta.credits);
            const amountPaid = Number(meta.amountPaid);

            if (userId && creditsToAdd > 0) {
                console.log(`[Webhook] Processing successful payment for user ${userId}.`);
                const client = await pool.connect();
                try {
                    await client.query('BEGIN');
                    
                    const { rows } = await client.query('UPDATE users SET credits = credits + $1 WHERE id = $2 RETURNING credits, email, first_name', [creditsToAdd, userId]);
                    const user = rows[0];
                    console.log(`[Webhook] DB: User ${userId} credits updated to ${user.credits}.`);

                    await client.query(
                        `INSERT INTO transactions (user_id, type, amount, description, status, metadata) VALUES ($1, 'purchase', $2, $3, 'success', $4)`,
                        [userId, creditsToAdd, `Purchased ${meta.bundleName}`, { stripeSessionId: session.id, amountPaid: amountPaid, currency: meta.currencyPaid }]
                    );
                    console.log(`[Webhook] DB: Transaction logged for user ${userId}.`);
                    
                    await client.query('COMMIT');
                    
                    redisSyncService.updateCredits(userId, user.credits).catch(err => console.error('[Webhook] Redis sync failed:', err));

                    if (resend && user.email) {
                        console.log(`[Webhook] Sending confirmation email to ${user.email}.`);
                        resend.emails.send({
                            from: process.env.EMAIL_FROM || 'noreply@datazag.com',
                            to: user.email,
                            subject: 'Your Datazag Credit Purchase Confirmation',
                            html: `<h1>Thank you, ${user.first_name}!</h1><p>We've added <strong>${creditsToAdd.toLocaleString()} credits</strong> to your account.</p><p>Amount paid: <strong>${(amountPaid / 100).toFixed(2)} ${meta.currencyPaid.toUpperCase()}</strong></p>`,
                        }).catch(err => console.error('[Webhook] Resend email failed:', err));
                    }
                } catch (dbError) {
                    await client.query('ROLLBACK');
                    console.error('[Webhook] Database transaction failed:', dbError);
                } finally {
                    client.release();
                }
            } else {
                console.warn('[Webhook] Metadata check failed. Either userId or creditsToAdd is invalid.', { userId, creditsToAdd });
            }
        }
        return res.json({ received: true });
    } catch (err) {
        console.error('Stripe webhook handler error:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }
});

/**
 * GET /api/invoices/:sessionId
 * Fetches the secure URL for a Stripe invoice PDF from a given Checkout Session ID.
 */
router.get('/invoices/:sessionId', authenticateToken, async (req, res) => {
  const { sessionId } = req.params;
  console.log(`Fetching invoice for session ID`);
  try {
      if (!stripe) return res.status(500).json({ error: 'Stripe not configured.' });

        const userId = req.user.id;

        // For security, verify the transaction belongs to the authenticated user.
        const { rows } = await pool.query(
            `SELECT * FROM transactions WHERE metadata->>'stripeSessionId' = $1 AND user_id = $2`,
            [sessionId, userId]
        );
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Invoice not found or you do not have permission to view it.' });
        }

        // 1. Retrieve the Checkout Session to get the Payment Intent ID
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        const paymentIntentId = session.payment_intent;
        if (typeof paymentIntentId !== 'string') {
            return res.status(404).json({ error: 'Payment details not found for this session.' });
        }

        // 2. Retrieve the Payment Intent to get the associated Charge ID
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
        const chargeId = paymentIntent.latest_charge;
        if (typeof chargeId !== 'string') {
            return res.status(404).json({ error: 'Charge details not found for this payment.' });
        }

        // 3. Retrieve the Charge object to get the receipt URL
        const charge = await stripe.charges.retrieve(chargeId);
        
        // Return the URL for the hosted receipt page
        return res.status(200).json({ invoiceUrl: charge.receipt_url });

    } catch (err) {
        console.error('Error fetching Stripe invoice:', err);
        return res.status(500).json({ error: 'Failed to retrieve invoice.' });
    }
});

module.exports = router;