import { db } from "@/lib/drizzle";
import { users, transactions, apiUsage } from "@/shared/schema";
import { eq, desc } from "drizzle-orm";
// The type imports are now combined into a single, clean line.
import type { User, Transaction, ApiUsage as ApiUsageType } from "@/shared/schema";

/**
 * Fetches the full user profile data from the database.
 * @param userId The ID of the user to fetch.
 * @returns The user object or null if not found.
 */
export async function fetchUserData(userId: string): Promise<User | null> {
  try {
    const userData = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });
    return userData ?? null;
  } catch (error) {
    console.error("Error fetching user data:", error);
    return null;
  }
}

/**
 * Fetches the transaction history for a specific user.
 * @param userId The ID of the user whose transactions to fetch.
 * @returns An array of transaction objects.
 */
export async function fetchUserTransactions(userId: string): Promise<Transaction[]> {
  try {
    const userTransactions = await db.query.transactions.findMany({
      where: eq(transactions.userId, userId),
      orderBy: [desc(transactions.createdAt)],
      limit: 100, // Limit to the last 100 transactions for initial load
    });
    return userTransactions;
  } catch (error) {
    console.error("Error fetching user transactions:", error);
    return []; // Return an empty array on error
  }
}

/**
 * Fetches the API usage history for a specific user.
 * @param userId The ID of the user whose API usage to fetch.
 * @returns An array of API usage objects.
 */
export async function fetchUserApiUsage(userId: string): Promise<ApiUsageType[]> {
  try {
    const userApiUsage = await db.query.apiUsage.findMany({
      where: eq(apiUsage.userId, userId),
      orderBy: [desc(apiUsage.createdAt)],
      limit: 100, // Limit to the last 100 usage records for initial load
    });
    return userApiUsage;
  } catch (error) {
    console.error("Error fetching user API usage:", error);
    return []; // Return an empty array on error
  }
}

/**
 * Fetches the payment history for a specific user, ensuring metadata is included.
 * @param userId The ID of the user whose payment history to fetch.
 * @returns An array of transaction objects.
 */
export async function fetchUserPaymentHistory(userId: string): Promise<Transaction[]> {
  try {
    const paymentHistory = await db.query.transactions.findMany({
      where: eq(transactions.userId, userId),
      orderBy: [desc(transactions.createdAt)],
      // We don't need to filter by type here, as the client will handle it.
      // The important part is that the 'metadata' column is selected by default.
    });
    return paymentHistory;
  } catch (error) {
    console.error("Error fetching user payment history:", error);
    return [];
  }
}