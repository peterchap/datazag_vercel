import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/drizzle';
import { apiUsage } from '@/shared/schema';
import { eq, sql, count, avg, and } from 'drizzle-orm';

// This is the new, dedicated API endpoint for calculating usage statistics.
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const userId = session.user.id;
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // 1. Perform all database aggregations in parallel for maximum performance
    const [statsResult, dailyUsageResult] = await Promise.all([
      db.select({
          totalQueries: count(apiUsage.id),
          // Calculate success rate by counting successful requests
          successfulQueries: count(sql`CASE WHEN status = 'success' THEN 1 END`),
          avgResponse: avg(apiUsage.responseTime),
        })
        .from(apiUsage)
        .where(eq(apiUsage.userId, userId)),
      
      db.select({
          date: sql<string>`DATE(created_at)`,
          requests: count(apiUsage.id),
        })
        .from(apiUsage)
        .where(and(
            eq(apiUsage.userId, userId),
            sql`created_at >= ${sevenDaysAgo.toISOString()}`
        ))
        .groupBy(sql`DATE(created_at)`)
        .orderBy(sql`DATE(created_at)`)
    ]);

    const stats = statsResult[0];
    const totalQueries = Number(stats.totalQueries);
    const successfulQueries = Number(stats.successfulQueries);
    const successRate = totalQueries > 0 ? (successfulQueries / totalQueries) * 100 : 100;

    // 2. Format the data for the chart
    const dailyUsageMap = new Map(dailyUsageResult.map(d => [d.date, Number(d.requests)]));
    const chartData = [...Array(7)].map((_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const day = date.toISOString().split('T')[0];
        return { 
            name: date.toLocaleDateString('en-US', { weekday: 'short' }),
            requests: dailyUsageMap.get(day) || 0
        };
    }).reverse();


    // 3. Return a single, clean statistics object
    return NextResponse.json({
      successRate: parseFloat(successRate.toFixed(1)),
      avgResponse: Math.round(Number(stats.avgResponse) || 0),
      totalQueries: totalQueries,
      chartData: chartData,
    });

  } catch (error) {
    console.error('Error fetching API usage summary:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}