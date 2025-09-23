/**
 * Redis Sync Service (TypeScript/ESM)
 * This service handles synchronization between the customer portal
 * and the Redis API's cache for API keys and credits.
 */

import axios from 'axios';

const REDIS_API_URL = process.env.REDIS_API_URL || process.env.BIGQUERY_API_URL || '';
const INTERNAL_API_TOKEN = process.env.INTERNAL_API_TOKEN;

if (!INTERNAL_API_TOKEN) {
  console.warn('INTERNAL_API_TOKEN not configured - Redis sync will be disabled');
}

export class RedisSyncService {
  async makeRequest(method: string, endpoint: string, data: any = null): Promise<any> {
    if (!INTERNAL_API_TOKEN) {
      console.warn('Redis sync skipped - INTERNAL_API_TOKEN not configured');
      return { success: false, statusCode: 503, message: 'Redis sync not configured' };
    }
    if (!REDIS_API_URL) {
      console.warn('Redis sync skipped - REDIS_API_URL not configured');
      return { success: false, statusCode: 503, message: 'Redis sync not configured' };
    }

    try {
      const response = await axios({
        method,
        url: `${REDIS_API_URL}${endpoint}`,
        data,
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Token': INTERNAL_API_TOKEN
        },
        timeout: 10000 // 10 second timeout
      });

      return {
        success: true,
        statusCode: response.status,
        message: response.data.message || 'Success',
        data: response.data
      };
    } catch (error: any) {
      console.warn(`Redis sync error (${method} ${endpoint}):`, error.message);
      if (error.response) {
        if (error.response.status === 404) {
          return {
            success: false,
            statusCode: 404,
            message: 'Redis sync endpoint not available'
          };
        }
        return {
          success: false,
          statusCode: error.response.status,
          message: error.response.data?.message || error.response.data?.detail || 'Redis sync failed'
        };
      } else if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
        return {
          success: false,
          statusCode: 502,
          message: 'Cannot connect to Redis API'
        };
      } else if (error.code === 'ECONNABORTED') {
        return {
          success: false,
          statusCode: 504,
          message: 'Redis API timeout'
        };
      } else {
        return {
          success: false,
          statusCode: 500,
          message: 'Redis sync service error'
        };
      }
    }
  }

  /**
   * Register a single API key in Redis
   */
  async registerApiKey(apiKeyData: any): Promise<any> {
    return this.makeRequest('POST', '/redis/api-key', {
      api_key: apiKeyData.key,
      user_id: apiKeyData.user_id,
      credits: apiKeyData.credits || 0,
      active: apiKeyData.active !== false,
      created_at: apiKeyData.created_at || new Date().toISOString(),
      name: apiKeyData.name || 'Unnamed Key'
    });
  }

  /**
   * Delete a single API key from Redis
   */
  async deleteApiKey(apiKey: string): Promise<any> {
    return this.makeRequest('DELETE', `/redis/api-key/${apiKey}`);
  }

  /**
   * Get information about a single API key
   */
  async getApiKey(apiKey: string): Promise<any> {
    return this.makeRequest('GET', `/redis/api-key/${apiKey}`);
  }

  /**
   * Update credits for ALL API keys belonging to a user
   * This is the main method called after credit purchases
   */
  async updateCredits(userId: string | number, credits: number): Promise<any> {
    console.log(`[Redis Sync] Updating credits for user ${userId} to ${credits}`);
    return this.makeRequest('PATCH', `/redis/user-credits/${userId}`, { credits });
  }

  /**
   * Update credits for a specific API key
   * Used when you need to update just one key
   */
  async updateApiKeyCredits(apiKey: string, credits: number): Promise<any> {
    return this.makeRequest('PATCH', `/redis/credits/${apiKey}`, { credits });
  }

  /**
   * Get credits for a specific user (from their first API key)
   */
  async getUserCredits(userId: string): Promise<any> {
    return this.makeRequest('GET', `/redis/user-credits/${userId}`);
  }

  /**
   * Get all API keys for a specific user
   */
  async getUserApiKeys(userId: string): Promise<any> {
    return this.makeRequest('GET', `/redis/user-api-keys/${userId}`);
  }

  /**
   * Get usage logs for a specific user and date (for sync)
   */
  async getUserUsageLogs(userId: string, date: string): Promise<any> {
    return this.makeRequest('GET', `/redis/usage-logs/${userId}/${date}`);
  }

  /**
   * Clear usage logs after successful sync
   */
  async clearUserUsageLogs(userId: string, date: string): Promise<any> {
    return this.makeRequest('DELETE', `/redis/usage-logs/${userId}/${date}`);
  }

  /**
   * Record API usage and decrement credits (called by public API)
   */
  async recordApiUsage(usageData: {
    api_key: string;
    endpoint: string;
    credits_used: number;
    response_time_ms?: number;
    status?: string;
    metadata?: any;
  }): Promise<any> {
    return this.makeRequest('POST', '/redis/record-usage', {
      api_key: usageData.api_key,
      endpoint: usageData.endpoint,
      credits_used: usageData.credits_used,
      response_time_ms: usageData.response_time_ms,
      status: usageData.status || 'success',
      metadata: usageData.metadata
    });
  }

  /**
   * Get current credit balance for an API key (fast check for public API)
   */
  async getApiKeyCredits(apiKey: string): Promise<any> {
    return this.makeRequest('GET', `/redis/credits/${apiKey}`);
  }

  /**
   * Check Redis sync status
   */
  async checkSyncStatus(): Promise<any> {
    return this.makeRequest('GET', '/redis/sync-status');
  }

  /**
   * Get Redis dump (for debugging)
   */
  async getRedisDump(): Promise<any> {
    return this.makeRequest('GET', '/redis/dump');
  }

  /**
   * Flush Redis database (use with caution!)
   */
  async flushRedisDb(): Promise<any> {
    return this.makeRequest('POST', '/redis/flushdb');
  }
}

export const redisSyncService = new RedisSyncService();
