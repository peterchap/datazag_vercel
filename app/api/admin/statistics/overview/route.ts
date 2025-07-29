import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/server/db';
import { users, apiKeys, transactions, apiUsage, USER_ROLES } from '@/shared/schema';
import { count, sum, eq } from 'drizzle-orm';

async function isAdmin(session: any) {
  if (!session?.user?.id) return false;
  
  const [user] = await db.select()
    .from(users)
    .where(eq(users.id, parseInt(session.user.id)))
    .limit(1);
    
  return user?.role === USER_ROLES.BUSINESS_ADMIN || user?.role === USER_ROLES.CLIENT_ADMIN;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!(await isAdmin(session))) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    // Get total users
    const [totalUsersResult] = await db.select({ count: count() }).from(users);
    const totalUsers = totalUsersResult.count;

    // Get total API keys
    const [totalApiKeysResult] = await db.select({ count: count() }).from(apiKeys);
    const totalApiKeys = totalApiKeysResult.count;

    // Get total transactions and revenue
    const [totalTransactionsResult] = await db.select({ count: count() }).from(transactions);
    const totalTransactions = totalTransactionsResult.count;

    const [revenueResult] = await db.select({ 
      total: sum(transactions.amount) 
    }).from(transactions).where(eq(transactions.type, 'purchase'));
    const totalRevenue = revenueResult.total || 0;

    // Get total API usage
    const [totalApiUsageResult] = await db.select({ count: count() }).from(apiUsage);
    const totalApiUsage = totalApiUsageResult.count;

    // Active discount codes would need to be added to schema
    const activeDiscountCodes = 0; // Placeholder

    return NextResponse.json({
      totalUsers,
      totalApiKeys,
      totalTransactions,
      totalApiUsage,
      totalRevenue,
      activeDiscountCodes
    });
  } catch (error) {
    console.error('Error fetching admin statistics:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
