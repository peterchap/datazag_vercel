import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/drizzle';
import { users, creditBundles } from '@/shared/schema';
import { eq } from 'drizzle-orm';
import { stripe } from '@/lib/stripe';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id ? parseInt(String((session!.user as any).id), 10) : undefined;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { bundleId } = body || {};
  if (!bundleId) return NextResponse.json({ error: 'Missing bundleId' }, { status: 400 });

  const [u] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!u) return NextResponse.json({ error: 'User not found' }, { status: 404 });
  if (u.canPurchaseCredits === false) return NextResponse.json({ error: 'Purchases disabled for this account' }, { status: 403 });
  const [bundle] = await db.select().from(creditBundles).where(eq(creditBundles.id, bundleId)).limit(1);
  if (!bundle) return NextResponse.json({ error: 'Bundle not found' }, { status: 404 });

  const origin = new URL(req.url).origin;

  // Accept currency and converted price from frontend if provided
  const { selectedCurrency, convertedPrice } = body || {};
    const priceData = {
      currency: selectedCurrency || bundle.currency || 'usd',
      product_data: {
        name: `${bundle.name} (${bundle.credits} credits)`,
        metadata: {
          credits: String(bundle.credits),
          bundleId: String(bundle.id),
          userId: String(userId), // Ensure userId is present in product metadata as well
        },
      },
      unit_amount: convertedPrice ? Math.round(convertedPrice * 100) : bundle.price * 100,
    } as const;

    // Create Checkout Session for one-time purchase
    const sessionCheckout = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{ price_data: priceData, quantity: 1 }],
      success_url: `${origin}/credits?success=1&bundleId=${bundle.id}`,
      cancel_url: `${origin}/credits?canceled=1`,
      metadata: {
        userId: String(userId),
        bundleId: String(bundle.id),
        credits: String(bundle.credits),
      },
    });

    return NextResponse.json({ url: sessionCheckout.url });
}
