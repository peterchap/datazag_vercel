import { db } from "@/lib/drizzle";
import { users, transactions, apiUsage, apiKeys } from "@/shared/schema";
import { eq, desc, or } from "drizzle-orm";
import type { User, Transaction, ApiUsage as ApiUsageType } from "@/shared/schema";
import { use } from "react";

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
export async function fetchApiUsage(userId: string): Promise<ApiUsageType[]> {
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
 * Fetches the payment history (purchase and credit grant transactions) for a specific user.
 * @param userId The ID of the user whose payment history to fetch.
 * @returns An array of transaction objects.
 */
export async function fetchUserPaymentHistory(userId: string): Promise<Transaction[]> {
  try {
    const paymentHistory = await db.query.transactions.findMany({
      where: eq(transactions.userId, userId),
      // This is more efficient as it only fetches relevant transaction types from the DB
      // where: or(
      //   eq(transactions.type, 'purchase'),
      //   eq(transactions.type, 'credit')
      // ),
      orderBy: [desc(transactions.createdAt)],
      limit: 250, // Increased limit for more comprehensive history
    });
    return paymentHistory;
  } catch (error) {
    console.error("Error fetching user payment history:", error);
    return [];
  }
}