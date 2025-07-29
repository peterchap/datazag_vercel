/**
 * Redis Sync Service (JavaScript)
 * 
 * This service handles synchronization between the customer portal
 * and the BigQuery API's Redis cache for API keys and credits.
 */

const axios = require('axios');

const BIGQUERY_API_URL = process.env.BIGQUERY_API_URL || 'https://api.datazag.com';
const INTERNAL_API_TOKEN = process.env.INTERNAL_API_TOKEN;

if (!INTERNAL_API_TOKEN) {
  console.warn('INTERNAL_API_TOKEN not configured - Redis sync will be disabled');
}

class RedisSyncService {
  async makeRequest(method, endpoint, data = null) {
    if (!INTERNAL_API_TOKEN) {
      console.warn('Redis sync skipped - INTERNAL_API_TOKEN not configured');
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
    } catch (error) {
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
  async registerApiKey(apiKeyData) {
    return this.makeRequest('POST', '/redis/api-key', {
      key: apiKeyData.key, // Raw API key as Redis key
      user_id: apiKeyData.user_id,
      credits: apiKeyData.credits || 0,
      active: apiKeyData.active !== false // Default to true if not specified
    });
  }

  /**
   * Delete an API key from Redis
   */
  async deleteApiKey(apiKey) {
    return this.makeRequest('DELETE', `/redis/api-key/${apiKey}`);
  }

  /**
   * Retrieve API key data from Redis (for verification)
   */
  async getApiKey(apiKey) {
    return this.makeRequest('GET', `/redis/api-key/${apiKey}`);
  }

  /**
   * Update user credits in Redis
   */
  async updateCredits(userId, credits) {
    return this.makeRequest('PATCH', `/redis/credits/${userId}`, {
      credits
    });
  }

  /**
   * Check Redis sync status
   */
  async checkSyncStatus() {
    return this.makeRequest('GET', '/redis/sync-status');
  }
}

const redisSyncService = new RedisSyncService();

module.exports = { redisSyncService };