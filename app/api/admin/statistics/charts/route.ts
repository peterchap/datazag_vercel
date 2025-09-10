import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/drizzle';
import { apiUsage, transactions } from '@/shared/schema';
import { USER_ROLES } from '@/shared/schema';
import { sql, count, sum, eq } from 'drizzle-orm';

// This is the new, unified API route for your admin chart data.
export async function GET() {
  const session = await auth();
  
  // 1. Secure the endpoint using the modern auth() helper
  if (!session?.user || (session.user.role !== USER_ROLES.BUSINESS_ADMIN && session.user.role !== USER_ROLES.CLIENT_ADMIN)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    // 2. Perform the database queries using Drizzle ORM
    
    // Query for API usage over the last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const dailyUsageResult = await db
      .select({
        date: sql<string>`DATE(created_at)`,
        requests: count(apiUsage.id),
      })
      .from(apiUsage)
      .where(sql`created_at >= ${sevenDaysAgo.toISOString()}`)
      .groupBy(sql`DATE(created_at)`)
      .orderBy(sql`DATE(created_at)`);

    // Query for revenue over the last 6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const monthlyRevenueResult = await db
      .select({
        month: sql<string>`TO_CHAR(created_at, 'YYYY-MM')`,
        revenue: sum(transactions.amount),
      })
      .from(transactions)
      .where(sql`${transactions.type} = 'purchase' AND ${transactions.createdAt} >= ${sixMonthsAgo.toISOString()}`)
      .groupBy(sql`TO_CHAR(created_at, 'YYYY-MM')`)
      .orderBy(sql`TO_CHAR(created_at, 'YYYY-MM')`);
    
    // 3. Format the data for the frontend charts
    const chartData = {
      usageByDayData: dailyUsageResult.map(d => ({ 
        name: new Date(d.date).toLocaleDateString('en-us', { weekday: 'short' }), 
        requests: Number(d.requests) 
      })),
      revenueByMonthData: monthlyRevenueResult.map(m => ({ 
        name: new Date(`${m.month}-02`).toLocaleDateString('en-us', { month: 'short' }), 
        revenue: parseInt(m.revenue || '0', 10) / 100 
      })),
    };

    return NextResponse.json(chartData);
    
  } catch (error) {
    console.error("Error fetching admin chart data:", error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}