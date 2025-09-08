import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth'; // 1. Import the new v5 auth helper
import { db } from '@/lib/drizzle';
import { transactions } from '@/shared/schema';
import { eq, desc } from 'drizzle-orm';

export async function GET() {
  // 2. Get the session using the modern auth() function
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Fetch transactions for the logged-in user from the database
    const userTransactions = await db.query.transactions.findMany({
      where: eq(transactions.userId, parseInt(session.user.id, 10)),
      orderBy: [desc(transactions.createdAt)],
      limit: 50, // Limit the number of transactions returned for performance
    });

    return NextResponse.json(userTransactions);
  } catch (error) {
    console.error('Failed to fetch transactions:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}