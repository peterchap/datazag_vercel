/**
 * Redis Sync Service (TypeScript/ESM)
 * This service handles synchronization between the customer portal
 * and the BigQuery API's Redis cache for API keys and credits.
 */

import axios from 'axios';

const BIGQUERY_API_URL = process.env.BIGQUERY_API_URL || '';
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
    if (!BIGQUERY_API_URL) {
      console.warn('Redis sync skipped - BIGQUERY_API_URL not configured');
      return { success: false, statusCode: 503, message: 'Redis sync not configured' };
    }

    try {
      const response = await axios({
        method,
        url: `${BIGQUERY_API_URL}${endpoint}`,
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
        data: response.data.data
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
          message: error.response.data?.message || 'Redis sync failed'
        };
      } else if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
        return {
          success: false,
          statusCode: 502,
          message: 'Cannot connect to BigQuery API'
        };
      } else if (error.code === 'ECONNABORTED') {
        return {
          success: false,
          statusCode: 504,
          message: 'BigQuery API timeout'
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

  async registerApiKey(apiKeyData: any): Promise<any> {
    return this.makeRequest('POST', '/redis/api-key', {
      key: apiKeyData.key,
      user_id: apiKeyData.user_id,
      credits: apiKeyData.credits || 0,
      active: apiKeyData.active !== false
    });
  }

  async deleteApiKey(apiKey: string): Promise<any> {
    return this.makeRequest('DELETE', `/redis/api-key/${apiKey}`);
  }

  async getApiKey(apiKey: string): Promise<any> {
    return this.makeRequest('GET', `/redis/api-key/${apiKey}`);
  }

  async updateCredits(userId: string | number, credits: number): Promise<any> {
    return this.makeRequest('PATCH', `/redis/credits/${userId}`, { credits });
  }

  async checkSyncStatus(): Promise<any> {
    return this.makeRequest('GET', '/redis/sync-status');
  }
}

export const redisSyncService = new RedisSyncService();
