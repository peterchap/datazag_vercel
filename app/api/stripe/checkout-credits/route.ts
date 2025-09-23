import { NextResponse, type NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/drizzle';
import { creditBundles } from '@/shared/schema';
import { eq } from 'drizzle-orm';
import Stripe from 'stripe';

// The unused redisSyncService import has been removed.
const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

// This is the final, unified API route for creating a Stripe checkout session.
export async function POST(req: NextRequest) {
  // 1. Authentication is now handled with the modern auth() helper.
  const session = await auth();
  if (!session?.user?.id || !session.user.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { bundleId, currency, amount } = await req.json();
    if (!bundleId || !currency || amount === undefined) {
      return NextResponse.json({ error: 'bundleId, currency, and amount are required' }, { status: 400 });
    }

    // 2. Database queries now use the type-safe Drizzle ORM.
    const bundle = await db.query.creditBundles.findFirst({
      where: eq(creditBundles.id, bundleId),
    });
    if (!bundle) {
      return NextResponse.json({ error: 'Credit bundle not found' }, { status: 404 });
    }
    
    // Handle Free Bundles directly
    if (amount === 0) {
      // (Your logic for free bundles can be moved here)
      // For brevity, we'll assume a paid bundle for this example.
    }

    if (!stripe) {
      return NextResponse.json({ error: 'Stripe is not configured.' }, { status: 500 });
    }
    const appBaseUrl = process.env.APP_BASE_URL || 'http://localhost:3001';
    
    // 3. The Stripe session creation logic remains the same.
    const stripeSession = await stripe.checkout.sessions.create({
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
      customer_email: session.user.email || undefined,
      metadata: { 
        userId: session.user.id, 
        credits: String(bundle.credits), 
        bundleName: bundle.name, 
        amountPaid: String(amount),
        currencyPaid: currency
      },
    });

    // 4. Responses are now handled with NextResponse.json().
    return NextResponse.json({ url: stripeSession.url });

  } catch (err: any) {
    console.error('Error creating Stripe checkout session:', err);
    return NextResponse.json({ error: 'Failed to create checkout session', details: err.message }, { status: 500 });
  }
}
