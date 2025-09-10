import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/drizzle';
import { transactions } from '@/shared/schema';
import { eq, desc } from 'drizzle-orm';

/**
 * GET /api/transactions
 * Fetches the transaction history for the currently authenticated user.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const userTransactions = await db.query.transactions.findMany({
      where: eq(transactions.userId, parseInt(session.user.id, 10)),
      orderBy: [desc(transactions.createdAt)],
    });

    return NextResponse.json(userTransactions);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
