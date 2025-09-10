import { NextResponse, type NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/drizzle';
import { users } from '@/shared/schema';
import { eq } from 'drizzle-orm';
import Stripe from 'stripe';

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

// This is the new, unified API route for creating a Stripe subscription checkout session.
export async function POST(req: NextRequest) {
  // 1. Authenticate the user securely on the server.
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    if (!stripe) {
      return NextResponse.json({ error: 'Stripe is not configured.' }, { status: 500 });
    }
    
    const { priceId, planId } = await req.json();
    if (!priceId) {
      return NextResponse.json({ error: 'Price ID is required.' }, { status: 400 });
    }

    // 2. Fetch the user's Stripe Customer ID from your database.
    const userRecord = await db.query.users.findFirst({
        where: eq(users.id, parseInt(session.user.id, 10)),
        columns: { stripeCustomerId: true, email: true }
    });

    let customerId = userRecord?.stripeCustomerId;

    // 3. If the user is not yet a Stripe customer, create one.
    if (!customerId) {
        const customer = await stripe.customers.create({
            email: userRecord?.email || session.user.email || undefined,
            metadata: { userId: session.user.id },
        });
        customerId = customer.id;
        // Save the new customer ID to your database for future use.
        await db.update(users).set({ stripeCustomerId: customerId }).where(eq(users.id, parseInt(session.user.id, 10)));
    }

    const appBaseUrl = process.env.APP_BASE_URL || 'http://localhost:3001';

    // 4. Create a new subscription checkout session with Stripe.
    const stripeSession = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appBaseUrl}/billing?subscription_success=true`,
      cancel_url: `${appBaseUrl}/billing?subscription_canceled=true`,
      allow_promotion_codes: true,
      // This is the crucial part that fixes the bug in your webhook.
      // We are now attaching the userId to the metadata.
      subscription_data: {
        metadata: { 
            userId: session.user.id,
            planId: planId || '0', // Pass the planId for the webhook
        }
      }
    });

    // 5. Return the secure URL for the checkout session to the frontend.
    return NextResponse.json({ url: stripeSession.url });

  } catch (err: any) {
    console.error('Error creating Stripe subscription checkout session:', err);
    return NextResponse.json({ error: 'Failed to create checkout session', details: err.message }, { status: 500 });
  }
}

