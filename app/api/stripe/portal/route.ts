import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { pool } from '@/lib/db';
import { stripe } from '@/lib/stripe';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions as any);
  const user = (session as any)?.user as any;
  if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const client = await pool.connect();
  try {
    const origin = new URL(req.url).origin;
    const { rows } = await client.query('SELECT stripe_customer_id FROM users WHERE id = $1', [user.id]);
    const customerId = rows[0]?.stripe_customer_id;
    if (!customerId) return NextResponse.json({ error: 'No Stripe customer' }, { status: 400 });

    const portal = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${origin}/billing`,
    });
    return NextResponse.json({ url: portal.url });
  } catch (e: any) {
    return NextResponse.json({ error: 'Stripe error', details: e?.message }, { status: 500 });
  } finally {
    client.release();
  }
}