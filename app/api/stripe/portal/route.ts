import { NextResponse, type NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/drizzle';
import { users } from '@/shared/schema';
import { eq } from 'drizzle-orm';
import Stripe from 'stripe';

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

// This is the final, unified API route for creating a Stripe Customer Portal session.
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
    
    // 2. Fetch the user's Stripe Customer ID from your database using Drizzle.
    const userRecord = await db.query.users.findFirst({
        where: eq(users.id, session.user.id),
        columns: {
            stripeCustomerId: true,
        }
    });

    const customerId = userRecord?.stripeCustomerId;

    if (!customerId) {
      return NextResponse.json({ error: "You are not a Stripe customer yet. Please make a purchase first." }, { status: 400 });
    }

    const appBaseUrl = process.env.APP_BASE_URL || 'http://localhost:3001';

    // 3. Create a new Billing Portal session with Stripe.
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      // This is the URL the user will be sent back to after they are done managing their subscription.
      return_url: `${appBaseUrl}/billing`,
    });

    // 4. Return the secure URL for the portal session to the frontend.
    return NextResponse.json({ url: portalSession.url });

  } catch (err: any) {
    console.error('Error creating Stripe portal session:', err);
    return NextResponse.json({ error: 'Failed to create portal session', details: err.message }, { status: 500 });
  }
}