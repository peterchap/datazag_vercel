import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/drizzle';
import { transactions } from '@/shared/schema';
import { eq, desc } from 'drizzle-orm';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const userTransactions = await db.query.transactions.findMany({
      where: eq(transactions.userId, session.user.id),
      orderBy: [desc(transactions.createdAt)],
    });

    // 👇 ADD THIS MAPPING LOGIC
    const formattedTransactions = userTransactions.map(tx => ({
      id: tx.id,
      userId: tx.userId,
      type: tx.type,
      originalAmount: tx.originalAmount,
      amountInBaseCurrencyCents: tx.amountInBaseCurrencyCents,
      originalCurrency: tx.originalCurrency,
      exchangeRateAtPurchase: tx.exchangeRateAtPurchase,
      paymentMethod: tx.paymentMethod,
      gatewayCustomerId: tx.gatewayCustomerId,
      credits: tx.credits,
      description: tx.description,
      status: tx.status,
      metadata: tx.metadata,
      createdAt: tx.createdAt,
    }));

    // Return the newly formatted array
    return NextResponse.json(formattedTransactions);
    
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
