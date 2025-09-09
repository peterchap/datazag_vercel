import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/drizzle';
import { users, transactions } from '@/shared/schema';
import { eq, desc, and, gte, lte, inArray } from 'drizzle-orm';
import { USER_ROLES } from '@/shared/schema';

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user || (session.user.role !== USER_ROLES.BUSINESS_ADMIN && session.user.role !== USER_ROLES.CLIENT_ADMIN)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const companies = searchParams.getAll('company');

    // Build the query dynamically based on filters
    const conditions = [];
    if (userId) conditions.push(eq(transactions.userId, parseInt(userId, 10)));
    
    // --- THIS IS THE FIX ---
    // We now pass the ISO date string directly, which matches the database column's type.
    if (startDate) conditions.push(gte(transactions.createdAt, startDate));
    if (endDate) conditions.push(lte(transactions.createdAt, endDate));
    // --- END OF FIX ---
    
    if (companies.length > 0) conditions.push(inArray(users.company, companies));

    const filteredTransactions = await db.select({
        transaction: transactions,
        userEmail: users.email,
        company: users.company,
      })
      .from(transactions)
      .leftJoin(users, eq(transactions.userId, users.id))
      .where(and(...conditions))
      .orderBy(desc(transactions.createdAt));

    const flatData = filteredTransactions.map(item => ({ ...item.transaction, userEmail: item.userEmail, company: item.company }));

    return NextResponse.json(flatData);

  } catch (error) {
    console.error('Error fetching filtered transactions:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}