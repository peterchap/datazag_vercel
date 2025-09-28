import { db } from "@/lib/drizzle";
import { users, creditTransactions, apiUsage } from "@/shared/schema";
import { eq, and, desc, sum } from "drizzle-orm";
import type { User } from "@/shared/schema";
import { PgColumn } from "drizzle-orm/pg-core";

/**
 * Fetches the list of users belonging to the same company as the
 * currently authenticated client admin. If the admin user does not have a company,
 * only their own user record will be returned (singleton). If no client admin has been
 * assigned to users in the same company, those users will not be included unless their
 * company matches the admin's company.
 * @param adminUserId The ID of the client admin making the request.
 * @returns An array of user objects.
 */
export async function fetchCompanyUsers(adminUserId: string): Promise<User[]> {
  try {
    // 1. First, get the client admin's own user record to find their company name.
    const adminUser = await db.query.users.findFirst({
        where: eq(users.id, adminUserId),
        columns: { company: true }
    });

    if (!adminUser?.company) {
        console.warn(`Client admin with ID ${adminUserId} does not have a company associated.`);
        return [];
    }

    // 2. Then, fetch all users who belong to that same company.
    const companyUsers = await db.query.users.findMany({
        where: eq(users.company, adminUser.company),
        orderBy: (users, { asc }) => [asc(users.firstName)],
    });

    return companyUsers;

  } catch (error) {
    console.error("Error fetching company users directly from DB:", error);
    return []; // Return an empty array on error to prevent the page from crashing.
  }
}

export async function fetchUsageData(company: string) {
  try {
    // Get usage data from api_usage table with user info
    const usageRecords = await db
      .select({
      id: apiUsage.id,
      userId: apiUsage.userId,
      amount: apiUsage.creditsUsed,
      description: apiUsage.endpoint, // or use another field if available
      date: apiUsage.createdAt,
      endpoint: apiUsage.endpoint,
      userName: users.firstName,
      lastName: users.lastName,
      userEmail: users.email,
      })
      .from(apiUsage)
      .innerJoin(users, eq(users.id, apiUsage.userId))
      .where(eq(users.company, company))
      .orderBy(desc(apiUsage.createdAt));

    // Transform the data
    return usageRecords.map(record => ({
      id: record.id,
      userId: record.userId,
      userName: `${record.userName} ${record.lastName}`,
      userEmail: record.userEmail,
      amount: record.amount,
      description: record.description || `API call to ${record.endpoint}`,
      date: record.date,
      endpoint: record.endpoint
    }));
  } catch (error) {
    console.error('Error fetching usage data:', error);
    return [];
  }
}

export async function fetchTransactions(company: string) {
  try {
    // Get transactions from creditTransactions table
    const transactions = await db
      .select({
        id: creditTransactions.id,
        userId: creditTransactions.userId,
        amount: creditTransactions.amount,
        type: creditTransactions.type,
        description: creditTransactions.description,
        createdAt: creditTransactions.createdAt,
        userName: users.firstName,
        lastName: users.lastName,
        userEmail: users.email,
      })
      .from(creditTransactions)
      .innerJoin(users, eq(users.id, creditTransactions.userId))
      .where(eq(users.company, company))
      .orderBy(desc(creditTransactions.createdAt));

    // Transform the data
    return transactions.map(tx => ({
      id: tx.id,
      userId: tx.userId,
      userName: `${tx.userName} ${tx.lastName}`,
      userEmail: tx.userEmail,
      amount: tx.amount,
      type: tx.type as 'allocation' | 'usage' | 'purchase' | 'refund',
      description: tx.description,
      createdAt: tx.createdAt
    }));
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return [];
  }
}
