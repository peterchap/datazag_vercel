import { db } from './db';
import { eq, and, or, desc, asc, count, sql } from 'drizzle-orm';
import * as schema from '../shared/schema';

/**
 * Optimized database helpers for better performance in serverless environments
 */

// Connection helper with retry logic
export async function withDatabase<T>(
  operation: () => Promise<T>,
  retries = 3
): Promise<T> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      console.error(`Database operation failed (attempt ${attempt}/${retries}):`, error);
      
      if (attempt === retries) {
        throw error;
      }
      
      // Exponential backoff
      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw new Error('All database operation attempts failed');
}

// Optimized user queries
export const userQueries = {
  // Find user by email with minimal data
  async findByEmail(email: string) {
    return await withDatabase(async () => {
      const result = await db
        .select({
          id: schema.users.id,
          email: schema.users.email,
          firstName: schema.users.firstName,
          lastName: schema.users.lastName,
          password: schema.users.password,
          role: schema.users.role,
          active: schema.users.active,
          emailVerified: schema.users.emailVerified,
        })
        .from(schema.users)
        .where(eq(schema.users.email, email))
        .limit(1);
      
      return result[0] || null;
    });
  },

  // Find user with full profile data
  async findFullProfile(id: number) {
    return await withDatabase(async () => {
      const result = await db
        .select()
        .from(schema.users)
        .where(and(
          eq(schema.users.id, id),
          eq(schema.users.active, true)
        ))
        .limit(1);
      
      return result[0] || null;
    });
  },

  // Get user with credits and usage stats
  async getUserDashboard(id: number) {
    return await withDatabase(async () => {
      const userResult = await db
        .select({
          id: schema.users.id,
          firstName: schema.users.firstName,
          lastName: schema.users.lastName,
          email: schema.users.email,
          company: schema.users.company,
          credits: schema.users.credits,
          role: schema.users.role,
          lastLogin: schema.users.lastLogin,
        })
        .from(schema.users)
        .where(and(
          eq(schema.users.id, id),
          eq(schema.users.active, true)
        ))
        .limit(1);

      if (!userResult[0]) return null;

      // Get API key count
      const apiKeyCount = await db
        .select({ count: count() })
        .from(schema.apiKeys)
        .where(and(
          eq(schema.apiKeys.userId, id),
          eq(schema.apiKeys.isActive, true)
        ));

      return {
        ...userResult[0],
        apiKeyCount: apiKeyCount[0]?.count || 0,
      };
    });
  },
};

// Optimized API key queries
export const apiKeyQueries = {
  // Get user's active API keys
  async getUserApiKeys(userId: number) {
    return await withDatabase(async () => {
      return await db
        .select({
          id: schema.apiKeys.id,
          name: schema.apiKeys.name,
          key: schema.apiKeys.key,
          createdAt: schema.apiKeys.createdAt,
          isActive: schema.apiKeys.isActive,
        })
        .from(schema.apiKeys)
        .where(and(
          eq(schema.apiKeys.userId, userId),
          eq(schema.apiKeys.isActive, true)
        ))
        .orderBy(desc(schema.apiKeys.createdAt));
    });
  },

  // Validate API key (optimized for frequent calls)
  async validateApiKey(keyValue: string) {
    return await withDatabase(async () => {
      const result = await db
        .select({
          id: schema.apiKeys.id,
          userId: schema.apiKeys.userId,
          name: schema.apiKeys.name,
          isActive: schema.apiKeys.isActive,
        })
        .from(schema.apiKeys)
        .where(and(
          eq(schema.apiKeys.key, keyValue),
          eq(schema.apiKeys.isActive, true)
        ))
        .limit(1);

      return result[0] || null;
    });
  },
};

// Optimized transaction queries
export const transactionQueries = {
  // Get user's recent transactions
  async getUserTransactions(userId: number, limit = 10) {
    return await withDatabase(async () => {
      return await db
        .select({
          id: schema.transactions.id,
          type: schema.transactions.type,
          amount: schema.transactions.amount,
          description: schema.transactions.description,
          status: schema.transactions.status,
          createdAt: schema.transactions.createdAt,
        })
        .from(schema.transactions)
        .where(eq(schema.transactions.userId, userId))
        .orderBy(desc(schema.transactions.createdAt))
        .limit(limit);
    });
  },

  // Get user's credit usage statistics
  async getCreditStats(userId: number, days = 30) {
    return await withDatabase(async () => {
      const result = await db
        .select({
          totalUsed: sql<number>`COALESCE(SUM(CASE WHEN ${schema.transactions.type} = 'usage' THEN ABS(${schema.transactions.amount}) ELSE 0 END), 0)`,
          totalPurchased: sql<number>`COALESCE(SUM(CASE WHEN ${schema.transactions.type} = 'purchase' THEN ${schema.transactions.amount} ELSE 0 END), 0)`,
          transactionCount: count(),
        })
        .from(schema.transactions)
        .where(and(
          eq(schema.transactions.userId, userId),
          sql`${schema.transactions.createdAt} >= NOW() - INTERVAL '${sql.raw(days.toString())} days'`
        ));

      return result[0] || { totalUsed: 0, totalPurchased: 0, transactionCount: 0 };
    });
  },
};

// Health check query
export async function healthCheck(): Promise<boolean> {
  try {
    await withDatabase(async () => {
      await db.execute(sql`SELECT 1`);
    });
    return true;
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
}

// Connection cleanup for serverless
export async function cleanup() {
  try {
    if (process.env.VERCEL === '1') {
      // In Vercel, connections are automatically cleaned up
      return;
    }
    
    // For local development, manually close connections
    const { pool } = await import('./db');
    await pool.end();
  } catch (error) {
    console.error('Database cleanup error:', error);
  }
}
