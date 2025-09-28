// Customer Portal: lib/usage-sync-service.ts
// Complete service to sync API usage from Redis back to portal database

import { db } from '@/lib/drizzle';
import { users, apiKeys, apiUsage } from '@/shared/schema';
import { eq } from 'drizzle-orm';
import { redisSyncService } from '@/lib/redis-sync-client';

interface UsageRecord {
  api_key: string;
  user_id: string;
  endpoint: string;
  credits_used: number;
  remaining_credits: number;
  response_time_ms?: number;
  status: string;
  timestamp: string;
  metadata?: any;
}

export class UsageSyncService {
  
  /**
   * Sync API usage data from Redis to portal database
   * Should be called periodically (e.g., every hour or daily)
   */
  async syncUsageFromRedis(date?: string): Promise<{ success: boolean; synced: number; errors: number }> {
    const targetDate = date || new Date().toISOString().slice(0, 10).replace(/-/g, '');
    console.log(`[Usage Sync] Starting sync for date: ${targetDate}`);
    
    let totalSynced = 0;
    let totalErrors = 0;
    
    try {
      // Get all users who might have usage data
      const allUsers = await db.select({ id: users.id }).from(users);
      console.log(`[Usage Sync] Checking usage for ${allUsers.length} users`);
      
      for (const user of allUsers) {
        try {
          const result = await this.syncUserUsage(user.id, targetDate);
          totalSynced += result.synced;
          totalErrors += result.errors;
          
          // Log progress every 50 users
          if ((totalSynced + totalErrors) % 50 === 0) {
            console.log(`[Usage Sync] Progress: ${totalSynced} synced, ${totalErrors} errors`);
          }
          
        } catch (error) {
          console.error(`[Usage Sync] Error syncing user ${user.id}:`, error);
          totalErrors++;
        }
      }
      
      console.log(`[Usage Sync] Completed: ${totalSynced} records synced, ${totalErrors} errors`);
      
      return {
        success: totalErrors === 0,
        synced: totalSynced,
        errors: totalErrors
      };
      
    } catch (error) {
      console.error('[Usage Sync] Critical error during sync:', error);
      return { success: false, synced: totalSynced, errors: totalErrors + 1 };
    }
  }
  
  /**
   * Sync usage data for a specific user
   */
  async syncUserUsage(userId: string, date: string): Promise<{ synced: number; errors: number }> {
    console.log(`[Usage Sync] Syncing usage for user ${userId}, date ${date}`);
    
    try {
      // Get usage logs from Redis API using the new method
      const response = await redisSyncService.getUserUsageLogs(userId, date);
      
      if (!response.success) {
        if (response.statusCode === 404) {
          // No usage data for this user/date (this is normal)
          return { synced: 0, errors: 0 };
        } else {
          console.error(`[Usage Sync] Redis API error for user ${userId}:`, response.message);
          return { synced: 0, errors: 1 };
        }
      }
      
      const usageData = response.data;
      // Type guard to ensure usageData is an object with usage_records array
      const usageRecords: UsageRecord[] = (typeof usageData === 'object' && usageData !== null && Array.isArray((usageData as any).usage_records))
        ? (usageData as { usage_records: UsageRecord[] }).usage_records
        : [];
      
      if (usageRecords.length === 0) {
        return { synced: 0, errors: 0 };
      }
      
      console.log(`[Usage Sync] Found ${usageRecords.length} usage records for user ${userId}`);
      
      let syncedCount = 0;
      let errorCount = 0;
      
      // Process each usage record
      for (const record of usageRecords) {
        try {
          await this.insertUsageRecord(record);
          syncedCount++;
        } catch (error) {
          console.error(`[Usage Sync] Error inserting usage record:`, error);
          console.error(`[Usage Sync] Problematic record:`, record);
          errorCount++;
        }
      }
      
      // Update user's credit balance to match Redis (use the latest record)
      if (usageRecords.length > 0) {
        const latestRecord = usageRecords[usageRecords.length - 1];
        await this.updateUserCredits(userId, latestRecord.remaining_credits);
      }
      
      // Clear the usage logs from Redis after successful sync
      if (syncedCount > 0) {
        try {
          const clearResponse = await redisSyncService.clearUserUsageLogs(userId, date);
          if (clearResponse.success) {
            console.log(`[Usage Sync] Cleared Redis usage logs for user ${userId}, date ${date}`);
          } else {
            console.warn(`[Usage Sync] Failed to clear Redis logs for user ${userId}:`, clearResponse.message);
          }
        } catch (error) {
          console.error(`[Usage Sync] Error clearing Redis logs for user ${userId}:`, error);
          // Don't count this as a sync error since the data was processed successfully
        }
      }
      
      return { synced: syncedCount, errors: errorCount };
      
    } catch (error) {
      console.error(`[Usage Sync] Error syncing user ${userId}:`, error);
      return { synced: 0, errors: 1 };
    }
  }
  
  /**
   * Insert a usage record into the portal database
   */
  private async insertUsageRecord(record: UsageRecord): Promise<void> {
    // Get the API key ID from the database
    const apiKeyRecord = await db
      .select({ id: apiKeys.id })
      .from(apiKeys)
      .where(eq(apiKeys.key, record.api_key))
      .limit(1);
    
    if (apiKeyRecord.length === 0) {
      throw new Error(`API key not found in database: ${record.api_key}`);
    }
    
    // Insert usage record
    await db.insert(apiUsage).values({
      userId: record.user_id,
      apiKeyId: apiKeyRecord[0].id,
      endpoint: record.endpoint,
      creditsUsed: record.credits_used,
      status: record.status,
      responseTime: record.response_time_ms || 0,
      createdAt: record.timestamp,
    });
  }
  
  /**
   * Update user's credit balance in the database
   */
  private async updateUserCredits(userId: string, newCredits: number): Promise<void> {
    await db
      .update(users)
      .set({ credits: newCredits })
      .where(eq(users.id, userId));
    
    console.log(`[Usage Sync] Updated user ${userId} credits to ${newCredits}`);
  }
  
  /**
   * Get current credit discrepancies between Redis and database
   */
  async checkCreditDiscrepancies(): Promise<Array<{ userId: string; dbCredits: number; redisCredits: number; difference: number }>> {
    const discrepancies: Array<{ userId: string; dbCredits: number; redisCredits: number; difference: number }> = [];
    
    try {
      console.log('[Usage Sync] Checking credit discrepancies between DB and Redis...');
      
      // Get all users with API keys
      const usersWithApiKeys = await db
        .select({ 
          userId: users.id, 
          dbCredits: users.credits,
          apiKey: apiKeys.key 
        })
        .from(users)
        .innerJoin(apiKeys, eq(apiKeys.userId, users.id))
        .where(eq(apiKeys.active, true));
      
      console.log(`[Usage Sync] Checking ${usersWithApiKeys.length} user/API key combinations`);
      
      // Check Redis credits for each user (using their first API key)
      const userCreditMap = new Map<string, number>();
      
      for (const userApiKey of usersWithApiKeys) {
        if (!userCreditMap.has(userApiKey.userId)) {
          try {
            const redisResponse = await redisSyncService.getApiKey(userApiKey.apiKey);
            
            if (redisResponse.success && redisResponse.data) {
              const redisCredits = (redisResponse.data && typeof (redisResponse.data as any).credits === 'number')
                ? (redisResponse.data as any).credits
                : 0;
              
              if ((userApiKey.dbCredits || 0) !== redisCredits) {
                discrepancies.push({
                  userId: userApiKey.userId,
                  dbCredits: userApiKey.dbCredits || 0,
                  redisCredits: redisCredits,
                  difference: (userApiKey.dbCredits || 0) - redisCredits
                });
                
                console.log(`[Usage Sync] Discrepancy found for user ${userApiKey.userId}: DB=${userApiKey.dbCredits}, Redis=${redisCredits}`);
              }
              
              userCreditMap.set(userApiKey.userId, redisCredits);
            } else {
              console.warn(`[Usage Sync] Could not get Redis credits for user ${userApiKey.userId}, API key ${userApiKey.apiKey}`);
            }
          } catch (error) {
            console.error(`[Usage Sync] Error checking Redis credits for user ${userApiKey.userId}:`, error);
          }
        }
      }
      
      console.log(`[Usage Sync] Found ${discrepancies.length} credit discrepancies`);
      return discrepancies;
      
    } catch (error) {
      console.error('[Usage Sync] Error checking credit discrepancies:', error);
      return [];
    }
  }
  
  /**
   * Force sync credits from database to Redis for all users
   * This is the main sync operation until Redis usage logging is implemented
   */
  async forceSyncCreditsToRedis(): Promise<{ synced: number; errors: number }> {
    console.log('[Usage Sync] Starting force sync from database to Redis');
    
    let syncedCount = 0;
    let errorCount = 0;
    
    try {
      const allUsers = await db
        .select({ id: users.id, credits: users.credits })
        .from(users);
      
      console.log(`[Usage Sync] Force syncing ${allUsers.length} users`);
      
      for (const user of allUsers) {
        try {
          const result = await redisSyncService.updateApiKeyCredits(user.id, user.credits || 0);
          if (result.success) {
            syncedCount++;
            if (syncedCount % 50 === 0) {
              console.log(`[Usage Sync] Progress: ${syncedCount}/${allUsers.length} users synced`);
            }
          } else {
            console.error(`[Usage Sync] Failed to sync user ${user.id}:`, result.message);
            errorCount++;
          }
        } catch (error) {
          console.error(`[Usage Sync] Error force syncing user ${user.id}:`, error);
          errorCount++;
        }
      }
      
      console.log(`[Usage Sync] Force sync completed: ${syncedCount} users synced, ${errorCount} errors`);
      
      return { synced: syncedCount, errors: errorCount };
      
    } catch (error) {
      console.error('[Usage Sync] Error during force sync:', error);
      return { synced: 0, errors: 1 };
    }
  }
  
  /**
   * Health check for the sync service
   */
  async healthCheck(): Promise<{ healthy: boolean; redis: boolean; database: boolean }> {
    let redisHealthy = false;
    let dbHealthy = false;
    
    try {
      // Check Redis connectivity
      const redisStatus = await redisSyncService.checkSyncStatus();
      redisHealthy = redisStatus.success;
      
      // Check database connectivity
      const dbTest = await db.select({ id: users.id }).from(users).limit(1);
      dbHealthy = !!dbTest;
      
    } catch (error) {
      console.error('[Usage Sync] Health check error:', error);
    }
    
    return {
      healthy: redisHealthy && dbHealthy,
      redis: redisHealthy,
      database: dbHealthy
    };
  }
}

export const usageSyncService = new UsageSyncService();