import { NextResponse, type NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/drizzle';
import { users, transactions } from '@/shared/schema';
import { eq, desc, sql } from 'drizzle-orm';
import { USER_ROLES } from '@/shared/schema';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user || (session.user.role !== USER_ROLES.BUSINESS_ADMIN && session.user.role !== USER_ROLES.CLIENT_ADMIN)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const offset = (page - 1) * limit;

    const [data, totalResult] = await Promise.all([
      db.select({
          transaction: transactions,
          userEmail: users.email,
        })
        .from(transactions)
        .leftJoin(users, eq(transactions.userId, users.id))
        .orderBy(desc(transactions.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ total: sql<number>`count(*)` }).from(transactions)
    ]);

    const flatData = data.map(item => ({ ...item.transaction, userEmail: item.userEmail }));
    const total = totalResult[0].total;
    
    return NextResponse.json({
        data: flatData,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit)
        }
    });

  } catch (error) {
    console.error('Error fetching admin transactions:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}