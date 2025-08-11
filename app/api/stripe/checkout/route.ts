import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { pool } from '@/lib/db';
import { stripe } from '@/lib/stripe';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions as any);
  const user = session?.user as any;
  if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const client = await pool.connect();
  try {
    const origin = new URL(req.url).origin;
    const { rows } = await client.query('SELECT stripe_customer_id, email FROM users WHERE id = $1', [user.id]);
    let customerId = rows[0]?.stripe_customer_id;
    const email = rows[0]?.email || user.email;

    if (!customerId) {
      const cust = await stripe.customers.create({
        email: email ?? undefined,
        metadata: { userId: String(user.id) },
      });
      customerId = cust.id;
      await client.query('UPDATE users SET stripe_customer_id = $1, updated_at = NOW() WHERE id = $2', [customerId, user.id]);
    }

    const price = process.env.NEXT_PUBLIC_STRIPE_PRICE_ID!;
    const checkout = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price, quantity: 1 }],
      success_url: `${origin}/billing?success=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/billing?canceled=1`,
      allow_promotion_codes: true,
      subscription_data: { metadata: { userId: String(user.id) } },
      metadata: { userId: String(user.id) },
    });

    return NextResponse.json({ url: checkout.url }, { status: 200 });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: 'Stripe error', details: e?.message }, { status: 500 });
  } finally {
    client.release();
  }
}