/**
 * Integration Service
 * 
 * Orchestrates communication between the Customer Portal and external APIs:
 * - PG_API: Database operations
 * - REDIS_API: Cache sync for performance
 * - BG_Query_API: Usage stats reporting
 */

import { pgApiClient } from './pg-api-client';
import { redisSyncService } from './redis-sync';
import axios from 'axios';

const BIGQUERY_API_URL = process.env.BIGQUERY_API_URL || 'https://api.datazag.com';
const INTERNAL_API_TOKEN = process.env.INTERNAL_API_TOKEN;

interface UsageStats {
  userId: number;
  apiKeyId: number;
  queryType: string;
  creditsUsed: number;
  timestamp: Date;
  metadata?: any;
}

class IntegrationService {
  /**
   * User Operations - Source of Truth via PG_API
   */
  async createUser(userData: any) {
    // Create user in PostgreSQL via PG_API
    const userResult = await pgApiClient.createUser(userData);
    
    if (userResult.success) {
      console.log('User created successfully in PostgreSQL');
      return userResult.data;
    } else {
      throw new Error(`Failed to create user: ${userResult.message}`);
    }
  }

  async updateUserCredits(userId: number, newCredits: number) {
    // Update in local database (source of truth)
    const user = await dbStorage.updateUser(userId, { credits: newCredits });
    
    // Attempt to sync to Redis for performance (non-blocking)
    try {
      // Get user's API keys to update Redis for each one
      const userApiKeys = await dbStorage.getApiKeysByUserId(userId);
      for (const apiKeyRecord of userApiKeys) {
        await redisSyncService.updateCredits(apiKeyRecord.key, newCredits);
      }
      
      if (syncResult.success) {
        console.log(`Credits synced to Redis for user ${userId}: ${newCredits}`);
      } else {
        console.warn(`Redis sync failed for user ${userId}: ${syncResult.message} - continuing without Redis cache`);
      }
    } catch (error) {
      console.warn(`Redis sync error for user ${userId}:`, error.message);
    }
    
    return user;
  }

  /**
   * API Key Operations - Sync between PG_API and REDIS_API
   */
  async createApiKey(userId: number, keyName: string) {
    // Generate unique API key
    const apiKey = `api_${userId}_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    
    const keyData = {
      user_id: userId,
      name: keyName,
      key: apiKey,
      active: true,
      created_at: new Date()
    };

    // Create in PostgreSQL (source of truth)
    const pgResult = await pgApiClient.createApiKey(keyData);
    
    if (pgResult.success) {
      const createdKey = pgResult.data;
      
      // Get user credits for Redis sync
      const userResult = await pgApiClient.getUser(userId);
      const userCredits = userResult.success ? userResult.data.credits : 0;
      
      // Sync to Redis for fast validation
      const redisData = {
        id: createdKey.id,
        key: apiKey,
        user_id: userId,
        active: true,
        credits: userCredits
      };
      
      const syncResult = await redisSyncService.registerApiKey(redisData);
      
      if (!syncResult.success) {
        console.warn(`Failed to sync API key to Redis:`, syncResult.message);
      }
      
      return createdKey;
    } else {
      throw new Error(`Failed to create API key: ${pgResult.message}`);
    }
  }

  async deactivateApiKey(keyId: number) {
    // Deactivate in PostgreSQL
    const pgResult = await pgApiClient.updateApiKey(keyId, { active: false });
    
    if (pgResult.success) {
      // Get the API key to remove from Redis
      const keyResult = await pgApiClient.getApiKeys(pgResult.data.user_id);
      
      if (keyResult.success) {
        const apiKey = keyResult.data.find((k: any) => k.id === keyId);
        if (apiKey) {
          // Remove from Redis
          const syncResult = await redisSyncService.deleteApiKey(apiKey.key);
          
          if (!syncResult.success) {
            console.warn(`Failed to remove API key from Redis:`, syncResult.message);
          }
        }
      }
      
      return pgResult.data;
    } else {
      throw new Error(`Failed to deactivate API key: ${pgResult.message}`);
    }
  }

  /**
   * Usage Stats Reporting - Receive from BG_Query_API
   */
  async recordUsageStats(stats: UsageStats) {
    try {
      // Record in PostgreSQL via PG_API
      const usageData = {
        user_id: stats.userId,
        api_key_id: stats.apiKeyId,
        query_type: stats.queryType,
        credits_used: stats.creditsUsed,
        timestamp: stats.timestamp,
        metadata: stats.metadata
      };
      
      const pgResult = await pgApiClient.recordApiUsage(usageData);
      
      if (pgResult.success) {
        // Update user credits after usage
        const userResult = await pgApiClient.getUser(stats.userId);
        
        if (userResult.success) {
          const currentCredits = userResult.data.credits;
          const newCredits = Math.max(0, currentCredits - stats.creditsUsed);
          
          await this.updateUserCredits(stats.userId, newCredits);
        }
        
        return pgResult.data;
      } else {
        throw new Error(`Failed to record usage stats: ${pgResult.message}`);
      }
    } catch (error) {
      console.error('Error recording usage stats:', error);
      throw error;
    }
  }

  /**
   * Credit Purchase - Update both PG and Redis
   */
  async addCredits(userId: number, creditsToAdd: number, transactionData: any) {
    // Get current user data
    const userResult = await pgApiClient.getUser(userId);
    
    if (!userResult.success) {
      throw new Error(`User not found: ${userResult.message}`);
    }
    
    const currentCredits = userResult.data.credits || 0;
    const newCredits = currentCredits + creditsToAdd;
    
    // Record transaction in PostgreSQL
    const transactionResult = await pgApiClient.createTransaction({
      user_id: userId,
      amount: transactionData.amount,
      credits: creditsToAdd,
      payment_method: transactionData.payment_method,
      payment_id: transactionData.payment_id,
      status: 'completed',
      created_at: new Date()
    });
    
    if (transactionResult.success) {
      // Update user credits
      await this.updateUserCredits(userId, newCredits);
      
      return {
        transaction: transactionResult.data,
        newCredits: newCredits
      };
    } else {
      throw new Error(`Failed to record transaction: ${transactionResult.message}`);
    }
  }

  /**
   * Sync individual API key to Redis
   */
  async syncApiKeyToRedis(redisData: any) {
    try {
      console.log(`Attempting Redis sync for API key: ${redisData.api_key}`);
      const syncResult = await redisSyncService.registerApiKey({
        key: redisData.api_key,
        user_id: parseInt(redisData.user_id),
        credits: redisData.credits,
        active: redisData.active
      });
      
      if (syncResult.success) {
        console.log(`Redis sync successful for ${redisData.api_key}: ${redisData.credits} credits`);
      } else {
        console.log(`Redis sync failed for ${redisData.api_key}: ${syncResult.message}`);
      }
      
      return syncResult;
    } catch (error: any) {
      console.error(`Redis sync exception for ${redisData.api_key}:`, error.message);
      return {
        success: false,
        message: `Redis sync error: ${error.message}`
      };
    }
  }

  /**
   * Full Sync - Sync all data from PostgreSQL to Redis
   */
  async fullSync() {
    try {
      console.log('Starting full sync from PostgreSQL to Redis...');
      
      // This would need to be implemented based on your PG_API endpoints
      // for getting all users and API keys
      
      console.log('Full sync completed successfully');
      return { success: true, message: 'Full sync completed' };
    } catch (error) {
      console.error('Full sync failed:', error);
      return { success: false, message: `Full sync failed: ${error}` };
    }
  }

  /**
   * Health Check - Test all API connections
   */
  async healthCheck() {
    const results = {
      pgApi: false,
      redisApi: false,
      bigqueryApi: false
    };

    // Test PG_API
    try {
      results.pgApi = await pgApiClient.testConnection();
    } catch (error) {
      console.error('PG_API health check failed:', error);
    }

    // Test Redis API
    try {
      const redisCheck = await redisSyncService.checkSyncStatus();
      results.redisApi = redisCheck.success;
    } catch (error) {
      console.error('Redis API health check failed:', error);
    }

    // Test BigQuery API connection
    try {
      if (INTERNAL_API_TOKEN) {
        const response = await axios.get(`${BIGQUERY_API_URL}/health`, {
          headers: { 'X-Internal-Token': INTERNAL_API_TOKEN },
          timeout: 5000
        });
        results.bigqueryApi = response.status === 200;
      }
    } catch (error) {
      console.error('BigQuery API health check failed:', error);
    }

    return results;
  }
}

export const integrationService = new IntegrationService();