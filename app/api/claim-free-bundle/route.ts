import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/drizzle';
import { users, transactions, creditBundles } from '@/shared/schema';
import { eq, and, sql } from 'drizzle-orm';
import { randomUUID } from 'crypto';

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { bundleId } = await req.json();
    const userId = session.user.id;

    const bundle = await db.query.creditBundles.findFirst({
      where: and(eq(creditBundles.id, bundleId), eq(creditBundles.price, 0))
    });

    if (!bundle) {
      return NextResponse.json({ message: 'Free bundle not found.' }, { status: 404 });
    }

    const COMPLETED = 'completed' as const;

// You might add a check here to ensure a user can only claim a free bundle once.
    await db.transaction(async (tx) => {
      await tx.update(users).set({ credits: sql`${users.credits} + ${bundle.credits}` }).where(eq(users.id, userId));
      await tx.insert(transactions).values({
        id: randomUUID(),
        userId,
        type: 'credits_purchase',
        credits: bundle.credits,
        description: `Claimed free bundle: ${bundle.name}`,
        status: COMPLETED,
        amountInBaseCurrencyCents: 0,
        originalAmount: 0,
        originalCurrency: 'USD',
        exchangeRateAtPurchase: String(1),
        paymentMethod: 'manual'
      });
    });


    
        return NextResponse.json({ success: true, message: 'Free bundle claimed.' });

  } catch (error) {
    console.error('Error claiming free bundle:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}