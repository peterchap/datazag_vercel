import { db } from "@/lib/drizzle";
import { users, adminRequests, requestComments, apiKeys, uploadJobs, transactions, apiUsage, discountCodes } from "@/shared/schema";
import { sql, count, sum, eq, desc, and, gte, lte, not } from "drizzle-orm";
import type { User, AdminRequest, RequestComment, UploadJob, Transaction } from "@/shared/schema";
import { use } from "react";

// A helper function to check the status of a service
async function checkServiceStatus(
    name: string, 
    checkFunction: () => Promise<boolean>
): Promise<{ name: string; status: 'Operational' | 'Degraded' | 'Offline'; message: string; }> {
  try {
    const isHealthy = await checkFunction();
    if (isHealthy) {
        return { name, status: 'Operational', message: 'Service is responding normally.' };
    }
    // This case handles situations where the service responds, but with an error status
    return { name, status: 'Degraded', message: 'Service responded with an unexpected status.' };
  } catch (error: any) {
    // This case handles network errors where the service cannot be reached
    return { name, status: 'Offline', message: error.message || 'Failed to connect to the service.' };
  }
}

export async function fetchAllAdminRequests() {
  try {
    const allRequests = await db.select({
      request: adminRequests,
      user: {
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
      }
    })
    .from(adminRequests)
    .leftJoin(users, eq(adminRequests.userId, users.id))
    .orderBy(desc(adminRequests.createdAt));
    
    // The result is an array of { request, user }, we'll flatten it
        return allRequests.map(item => ({ 
          ...item.request, 
          user: item.user 
        }));
      } catch (error) {
        console.error("Error fetching admin requests:", error);
        return [];
      }
    }

/**
 * Fetches the current health status of all critical backend services.
 * @returns An array of service status objects.
 */
export async function fetchSystemHealth() {;
  const redisApiUrl = process.env.REDIS_API_URL || 'http://localhost:3001';
  const publicApiUrl = process.env.BIGQUERY_API_URL || 'https://api.datazag.com';
  console.log("Redis API URL:", redisApiUrl);
  console.log("Public API URL:", publicApiUrl);

  const services = [
    // 1. Check PostgreSQL Database (include DB name in the message)
    (async () => {
      try {
      // Get the database name
      const result = await db.execute<{ current_database: string }>(sql`SELECT current_database()`);
      const dbName = result.rows?.[0]?.current_database || "unknown";
      await db.execute(sql`SELECT 1`);
      return {
        name: 'PostgreSQL Database',
        status: 'Operational',
        message: `Connected to database: ${dbName}`,
      };
      } catch (error: any) {
      return {
        name: 'PostgreSQL Database',
        status: 'Offline',
        message: error.message || 'Failed to connect to the database.',
      };
      }
    })(),

    // 2. Check Redis API (the FastAPI service on Cloud Run)
    checkServiceStatus('Redis API (Cloud Run)', async () => {
      if (!redisApiUrl) {
        throw new Error("REDIS_API_URL is not configured in your Next.js .env.local file.");
      }
      const response = await fetch(`${redisApiUrl}/ping`);
      return response.ok;
    }),
    
    // 3. Check the Public API
    checkServiceStatus('Public API', async () => {
      if (!publicApiUrl) {
          throw new Error("BIGQUERY_API_URL is not configured in your Next.js .env.local file.");
      }
      const response = await fetch(`${publicApiUrl}/health`);
      return response.ok;
    }),
  ];

  return Promise.all(services);
}

// This function fetches the main overview stats for the admin dashboard.
export async function fetchAdminOverviewStats() {
  try {
    // Perform all database queries in parallel for maximum efficiency
    const [
      userCountResult,
      apiKeyCountResult,
      transactionCountResult,
      apiUsageCountResult,
      revenueResult,
      pendingRequestsResult,
      activeDiscountsResult,
    ] = await Promise.all([
      db.select({ value: count() }).from(users),
      db.select({ value: count() }).from(apiKeys),
      db.select({ value: count() }).from(transactions),
      db.select({ value: count() }).from(apiUsage),
      db.select({ value: sum(transactions.amountInBaseCurrencyCents) }).from(transactions).where(eq(transactions.type, 'credits_purchase')),
      db.select({ value: count() }).from(adminRequests).where(eq(adminRequests.status, 'pending')),
      db.select({ value: count() }).from(discountCodes).where(eq(discountCodes.active, true)),
    ]);

    return {
      totalUsers: userCountResult[0].value,
      totalApiKeys: apiKeyCountResult[0].value,
      totalTransactions: transactionCountResult[0].value,
      totalApiUsage: apiUsageCountResult[0].value,
      totalRevenue: parseInt(revenueResult[0].value || '0', 10),
      pendingAdminRequests: pendingRequestsResult[0].value,
      activeDiscountCodes: activeDiscountsResult[0].value
    };
  } catch (error) {
    console.error("Error fetching admin overview stats:", error);
    // Return a default object in case of an error to prevent the page from crashing
    return { totalUsers: 0, totalApiKeys: 0, totalTransactions: 0, totalApiUsage: 0, totalRevenue: 0, pendingAdminRequests: 0, activeDiscountCodes: 0 };
  }
}

export async function fetchAllUsers(): Promise<User[]> {
  try {
    const allUsers = await db.query.users.findMany({
      orderBy: [desc(users.createdAt)],
    });
    return allUsers;
  } catch (error) {
    console.error("Error fetching all users:", error);
    return []; // Return an empty array on error
  }

}

export async function fetchAllUploadJobs() {
  try {
    const allJobs = await db.select({
      // Select all columns from the uploadJobs table
      job: uploadJobs,
      // And select the email from the users table
      userEmail: users.email,
    })
    .from(uploadJobs)
    .leftJoin(users, eq(uploadJobs.userId, users.id))
    .orderBy(desc(uploadJobs.createdAt));
    
    // The result is an array of { job, userEmail }, we'll flatten it
    return allJobs.map(item => ({ ...item.job, userEmail: item.userEmail }));

  } catch (error) {
    console.error("Error fetching all upload jobs:", error);
    return [];
  }
}

/**
 * Fetches an initial list of all transactions for the admin page.
 * @returns An array of transaction objects with user email.
 */
export async function fetchAllTransactions() {
  try {
    const allTransactions = await db.select({
        transaction: transactions,
        userEmail: users.email,
        // This is the fix: We now also select the company from the users table.
        company: users.company,
      })
      .from(transactions)
      .leftJoin(users, eq(transactions.userId, users.id))
      .orderBy(desc(transactions.createdAt))
      .limit(200);

    // The returned object now includes the company, satisfying the client component's type.
    return allTransactions.map(item => ({ 
        ...item.transaction, 
        userEmail: item.userEmail, 
        company: item.company 
    }));
  } catch (error) {
    console.error("Error fetching all transactions:", error);
    return [];
  }
}

/**
 * Fetches a simple list of all users (id and email) for filter dropdowns.
 * @returns An array of user objects.
 */
export async function fetchAllUsersForFilter() {
    try {
        const userList = await db.select({
            id: users.id,
            email: users.email,
        }).from(users).orderBy(users.email);
        return userList;
    } catch (error) {
        console.error("Error fetching users for filter:", error);
        return [];
    }
}

/**
 * Fetches a distinct list of all company names for the filter dropdown.
 * @returns An array of company names.
 */
export async function fetchAllCompaniesForFilter() {
    try {
        const companies = await db.selectDistinct({ company: users.company })
            .from(users)
            .where(not(eq(users.company, '')))
            .orderBy(users.company);
        return companies.map(c => c.company).filter(Boolean) as string[];
    } catch (error) {
        console.error("Error fetching companies for filter:", error);
        return [];
    }
}

export type RequestWithComments = AdminRequest & { comments: RequestComment[] };

/**
 * Fetches the request history for a specific user.
 * @param userId The ID of the user whose requests to fetch.
 * @returns An array of admin request objects.
 */
export async function fetchUserRequests(userId: string): Promise<RequestWithComments[]> {
  try {
    interface RequestHistoryItem extends AdminRequest {
      comments: RequestComment[];
    }

    const requestHistory: RequestHistoryItem[] = await db.query.adminRequests.findMany({
      where: eq(adminRequests.userId, userId),
      orderBy: [desc(adminRequests.createdAt)],
      // Use Drizzle's 'with' operator to efficiently load related comments
      with: {
      comments: {
        orderBy: (comments, { asc }) => [asc(comments.createdAt)],
      },
      },
    });
    return requestHistory;
  } catch (error) {
    console.error("Error fetching user requests with comments:", error);
    return []; // Return an empty array on error
  }
}

/**
 * Fetches aggregated data needed for the charts on the admin dashboard.
 * @returns An object containing data for various charts.
 */
export async function fetchAdminChartData() {
  try {
    // Example: Fetch API usage for the last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const dailyUsage = await db
      .select({
        date: sql<string>`DATE(created_at)`,
        requests: count(apiUsage.id),
      })
      .from(apiUsage)
      .where(sql`created_at >= ${sevenDaysAgo}`)
      .groupBy(sql`DATE(created_at)`)
      .orderBy(sql`DATE(created_at)`);

    // Example: Fetch revenue for the last 6 months
    // This is a simplified example; a real implementation might be more complex
    const monthlyRevenue = await db
        .select({
            month: sql<string>`TO_CHAR(created_at, 'YYYY-MM')`,
            revenue: sum(transactions.amountInBaseCurrencyCents),
        })
        .from(transactions)
        .where(eq(transactions.type, 'credits_purchase'))
        .groupBy(sql`TO_CHAR(created_at, 'YYYY-MM')`)
        .orderBy(sql`TO_CHAR(created_at, 'YYYY-MM')`)
        .limit(6);

    return {
      usageByDayData: dailyUsage.map(d => ({ name: new Date(d.date).toLocaleDateString('en-us', { weekday: 'short'}), requests: d.requests })),
      revenueByMonthData: monthlyRevenue.map(m => ({ name: new Date(`${m.month}-01`).toLocaleDateString('en-us', { month: 'short'}), revenue: parseInt(m.revenue || '0', 10) / 100 })),
    };
  } catch (error) {
    console.error("Error fetching admin chart data:", error);
    return { usageByDayData: [], revenueByMonthData: [] };
  }
}