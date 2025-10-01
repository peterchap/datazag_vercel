import { NextResponse, type NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/drizzle';
import { creditBundles } from '@/shared/schema';
import { eq } from 'drizzle-orm';
import Stripe from 'stripe';

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // DEBUG: Log all environment variables
  console.log('APP_BASE_URL:', process.env.APP_BASE_URL);
  console.log('All env keys:', Object.keys(process.env).filter(k => k.includes('APP')));

  if (!stripe) {
    return NextResponse.json({ error: 'Stripe is not configured.' }, { status: 500 });
  }

  try {
    // 1. Get the bundleId and the TARGET currency from the client
    const { bundleId, currency } = await req.json();
    if (!bundleId || !currency) {
      return NextResponse.json({ error: 'bundleId and currency are required' }, { status: 400 });
    }

    // 2. Fetch the bundle's BASE price from the database
    const bundle = await db.query.creditBundles.findFirst({
      where: eq(creditBundles.id, bundleId),
    });

    if (!bundle || bundle.price === undefined) {
      return NextResponse.json({ error: 'Credit bundle not found or price is missing' }, { status: 404 });
    }
    const priceInUsdCents = bundle.price;

    // 3. Fetch the latest exchange rates FROM YOUR OWN API
    const appBaseUrl = process.env.APP_BASE_URL;
    const ratesResponse = await fetch(`${appBaseUrl}/api/exchange-rates`);
    if (!ratesResponse.ok) throw new Error('Could not fetch exchange rates.');
    const { rates } = await ratesResponse.json();
    const conversionRate = rates[currency];
    if (!conversionRate) throw new Error(`Invalid or unsupported currency: ${currency}`);

    // 4. Calculate the final price in the target currency's cents
    const amountInLocalCurrencyCents = Math.round(priceInUsdCents * conversionRate);

    // 5. Create the Stripe session with the CALCULATED amount and FULL metadata
    const stripeSession = await stripe.checkout.sessions.create({
      mode: 'payment',
      success_url: `${appBaseUrl}/credits?success=1`,
      cancel_url: `${appBaseUrl}/credits?canceled=1`,
      line_items: [{
        quantity: 1,
        price_data: {
          currency: currency.toLowerCase(), // Stripe expects lowercase
          unit_amount: amountInLocalCurrencyCents,
          product_data: { name: `${bundle.name} Credits` },
        },
      }],
      customer_email: session.user.email,
      // This metadata is now rich with all the info your webhook needs
      metadata: {
        userId: session.user.id,
        credits: String(bundle.credits),
        amountInBaseCurrencyCents: String(priceInUsdCents),
        originalAmount: String(amountInLocalCurrencyCents),
        originalCurrency: currency,
        exchangeRateAtPurchase: String(conversionRate)
      },
    });

    return NextResponse.json({ url: stripeSession.url });

  } catch (err: any) {
    console.error('Error creating Stripe checkout session:', err);
    return NextResponse.json({ error: 'Failed to create checkout session', details: err.message }, { status: 500 });
  }
}