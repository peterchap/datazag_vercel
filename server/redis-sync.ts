/**
 * Redis Sync Service
 * 
 * This service handles synchronization between the customer portal
 * and the BigQuery API's Redis cache for API keys and credits.
 */

import axios from 'axios';

const REDIS_API_URL = process.env.REDIS_API_URL || 'https://redis-api-705890714749.europe-west2.run.app';
const INTERNAL_API_TOKEN = process.env.INTERNAL_API_TOKEN;

if (!INTERNAL_API_TOKEN) {
  console.warn('INTERNAL_API_TOKEN not configured - Redis sync will be disabled');
}

export interface RedisApiKey {
  id: number;
  key: string;
  user_id: number;
  active: boolean;
  credits?: number;
}

export interface RedisSyncResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data?: any;
}

class RedisSyncService {
  private async makeRequest(method: string, endpoint: string, data?: any): Promise<RedisSyncResponse> {
    if (!INTERNAL_API_TOKEN) {
      console.warn('Redis sync skipped - INTERNAL_API_TOKEN not configured');
      return { success: false, statusCode: 503, message: 'Redis sync not configured' };
    }

    try {
      const response = await axios({
        method,
        url: `${REDIS_API_URL}${endpoint}`,
        data,
        headers: {
          'Content-Type': 'application/json',
          'x-internal-token': INTERNAL_API_TOKEN
        },
        timeout: 10000 // 10 second timeout
      });

      return {
        success: true,
        statusCode: response.status,
        message: response.data.message || 'Success',
        data: response.data.data
      };
    } catch (error: any) {
      console.error(`Redis sync error (${method} ${endpoint}):`, error.message);
      
      if (error.response) {
        // Server responded with error status
        return {
          success: false,
          statusCode: error.response.status,
          message: error.response.data?.message || 'Redis sync failed'
        };
      } else if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
        // Connection failed
        return {
          success: false,
          statusCode: 502,
          message: 'Cannot connect to BigQuery API'
        };
      } else if (error.code === 'ECONNABORTED') {
        // Timeout
        return {
          success: false,
          statusCode: 504,
          message: 'BigQuery API timeout'
        };
      } else {
        // Other error
        return {
          success: false,
          statusCode: 500,
          message: 'Redis sync service error'
        };
      }
    }
  }

  /**
   * Register a new API key in Redis
   */
  async registerApiKey(apiKey: RedisApiKey): Promise<RedisSyncResponse> {
    return this.makeRequest('POST', '/redis/api-key', {
      key: apiKey.key, // Raw API key as Redis key
      user_id: apiKey.user_id,
      credits: apiKey.credits || 0,
      active: apiKey.active !== false // Default to true if not specified
    });
  }

  /**
   * Delete an API key from Redis
   */
  async deleteApiKey(apiKey: string): Promise<RedisSyncResponse> {
    return this.makeRequest('DELETE', `/redis/api-key/${apiKey}`);
  }

  /**
   * Retrieve API key data from Redis (for verification)
   */
  async getApiKey(apiKey: string): Promise<RedisSyncResponse> {
    return this.makeRequest('GET', `/redis/api-key/${apiKey}`);
  }

  /**
   * Update user credits in Redis
   */
  async updateCredits(apiKey: string, credits: number, operation: 'set' | 'increment' = 'set'): Promise<RedisSyncResponse> {
    return this.makeRequest('PATCH', `/redis/credits/${apiKey}`, {
      credits
    });
  }

  /**
   * Check Redis sync status
   */
  async checkSyncStatus(): Promise<RedisSyncResponse> {
    return this.makeRequest('GET', '/redis/sync-status');
  }

  /**
   * Sync all user data to Redis (useful for initial setup or recovery)
   */
  async syncUserData(userId: number, userCredits: number, apiKeys: RedisApiKey[]): Promise<{
    creditsSync: RedisSyncResponse;
    apiKeysSynced: number;
    apiKeysErrors: number;
  }> {
    // Update credits first
    const creditsSync = await this.updateCredits(userId, userCredits, 'set');
    
    // Sync all API keys
    let apiKeysSynced = 0;
    let apiKeysErrors = 0;
    
    for (const apiKey of apiKeys) {
      const result = await this.registerApiKey(apiKey);
      if (result.success) {
        apiKeysSynced++;
      } else {
        apiKeysErrors++;
        console.error(`Failed to sync API key ${apiKey.id}:`, result.message);
      }
    }
    
    return {
      creditsSync,
      apiKeysSynced,
      apiKeysErrors
    };
  }
}

export const redisSyncService = new RedisSyncService();