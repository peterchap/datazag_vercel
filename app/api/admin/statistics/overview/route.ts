import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/drizzle';
import { users, apiKeys, transactions, apiUsage, adminRequests, discountCodes } from '@/shared/schema';
import { eq, desc, sql, count, sum } from 'drizzle-orm';
import { USER_ROLES } from '@/shared/schema';

// This is now an API Route Handler for the GET method.
export async function GET() {
  const session = await auth();

  // Secure the endpoint to ensure only admins can access it
  if (!session?.user || (session.user.role !== USER_ROLES.BUSINESS_ADMIN && session.user.role !== USER_ROLES.CLIENT_ADMIN)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Your existing data-fetching logic is now inside the GET handler.
  try {
    const [
      userCountResult,
      apiKeyCountResult,
      transactionCountResult,
      apiUsageCountResult,
      revenueResult,
      pendingRequestsResult,
      activeDiscountsResult
    ] = await Promise.all([
        db.select({ value: count() }).from(users),
        db.select({ value: count() }).from(apiKeys),
        db.select({ value: count() }).from(transactions),
        db.select({ value: count() }).from(apiUsage),
        db.select({ value: sum(transactions.amountInBaseCurrencyCents) }).from(transactions).where(eq(transactions.type, 'credits_purchase')),
        db.select({ value: count() }).from(adminRequests).where(eq(adminRequests.status, 'pending')),
        db.select({ value: count() }).from(discountCodes).where(eq(discountCodes.active, true))
    ]);

    const stats = {
      totalUsers: userCountResult[0].value,
      totalApiKeys: apiKeyCountResult[0].value,
      totalTransactions: transactionCountResult[0].value,
      totalApiUsage: apiUsageCountResult[0].value,
      totalRevenue: parseInt(revenueResult[0].value || '0', 10),
      pendingAdminRequests: pendingRequestsResult[0].value,
      activeDiscountCodes: activeDiscountsResult[0].value
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error("Error fetching admin overview stats:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}