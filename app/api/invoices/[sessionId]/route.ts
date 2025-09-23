// app/api/invoices/[sessionId]/route.ts
// This matches your session-based auth setup
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-08-27.basil',
});

export async function GET(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const { sessionId } = params;

    console.log('Invoice request for sessionId:', sessionId);

    // Validate session ID format
    if (!sessionId || !sessionId.startsWith('cs_')) {
      console.log('Invalid session ID format');
      return NextResponse.json(
        { error: 'Invalid session ID' },
        { status: 400 }
      );
    }

    // Retrieve the checkout session from Stripe
    console.log('Retrieving checkout session from Stripe...');
    const checkoutSession = await stripe.checkout.sessions.retrieve(sessionId);
    console.log('Checkout session retrieved:', {
      id: checkoutSession.id,
      payment_status: checkoutSession.payment_status,
      has_invoice: !!checkoutSession.invoice,
      has_payment_intent: !!checkoutSession.payment_intent
    });

    // Try multiple approaches to get an invoice/receipt URL
    let documentUrl = null;
    let documentType = null;

    // Method 1: Check if there's a direct invoice
    if (checkoutSession.invoice) {
      console.log('Found invoice, retrieving...');
      const invoiceId =
        typeof checkoutSession.invoice === 'string'
          ? checkoutSession.invoice
          : checkoutSession.invoice?.id;

      if (typeof invoiceId === 'string' && invoiceId.length > 0) {
        const invoice = await stripe.invoices.retrieve(invoiceId);
        if (invoice.invoice_pdf) {
          documentUrl = invoice.invoice_pdf;
          documentType = 'invoice';
          console.log('Invoice PDF found');
        }
      } else {
        console.log('Invoice ID missing on checkout session');
      }
    }

    // Method 2: Get receipt from payment intent if no invoice
    if (!documentUrl && checkoutSession.payment_intent) {
      console.log('No invoice found, checking payment intent for receipt...');
      const paymentIntentId = typeof checkoutSession.payment_intent === 'string'
        ? checkoutSession.payment_intent
        : checkoutSession.payment_intent.id;
        
      try {
        const paymentIntent: Stripe.PaymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, {
          expand: ['latest_charge']
        });
        
        console.log('Payment intent retrieved:', {
          id: paymentIntent.id,
          status: paymentIntent.status,
          charges_count: paymentIntent.latest_charge ? 1 : 0
        });

        // Try to get the latest charge either from latest_charge or from the charges list
        let charge: Stripe.Charge | null = null;

        if (paymentIntent.latest_charge) {
          if (typeof paymentIntent.latest_charge === 'string') {
            try {
              charge = await stripe.charges.retrieve(paymentIntent.latest_charge);
            } catch (e) {
              console.log('Failed to retrieve latest_charge by id:', e);
            }
          } else {
            charge = paymentIntent.latest_charge;
          }
        }

        // Skipping access to paymentIntent.charges due to typings; rely on charges.list fallback below.

        if (charge) {
          console.log('Charge found:', {
            id: charge.id,
            has_receipt_url: !!charge.receipt_url
          });

          if (charge.receipt_url) {
            documentUrl = charge.receipt_url;
            documentType = 'receipt';
            console.log('Receipt URL found');
          }
        } else {
          console.log('No charges found on payment intent');

          // Method 3: Try to get charges separately if expand didn't work
          const charges = await stripe.charges.list({
            payment_intent: paymentIntentId,
            limit: 1
          });

          console.log('Charges list retrieved:', {
            count: charges.data.length
          });

          if (charges.data.length > 0) {
            const firstCharge = charges.data[0];
            if (firstCharge.receipt_url) {
              documentUrl = firstCharge.receipt_url;
              documentType = 'receipt';
              console.log('Receipt URL found via charges.list');
            }
          }
        }
      } catch (piError) {
        console.error('Error retrieving payment intent:', piError);
        // Continue to final check below
      }
    }

    if (!documentUrl) {
      console.log('No invoice or receipt found');
      return NextResponse.json(
        { error: 'No invoice or receipt available for this transaction' },
        { status: 404 }
      );
    }

    console.log('Returning document URL:', { type: documentType, hasUrl: !!documentUrl });

    return NextResponse.json({
      invoiceUrl: documentUrl,
      type: documentType,
      sessionId,
      amount: checkoutSession.amount_total,
      currency: checkoutSession.currency
    });

  } catch (error: any) {
    console.error('Error retrieving invoice:', error);
    
    if (error.type === 'StripeInvalidRequestError') {
      return NextResponse.json(
        { error: 'Session not found or invalid' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to retrieve invoice' },
      { status: 500 }
    );
  }
}