const axios = require('axios');
const { pool } = require('./db');

const CLOUD_RUN_API_URL = process.env.CLOUD_RUN_API_URL;
const INTERNAL_API_TOKEN = process.env.INTERNAL_API_TOKEN;

if (!CLOUD_RUN_API_URL || !INTERNAL_API_TOKEN) {
  console.warn('⚠️ CLOUD_RUN_API_URL or INTERNAL_API_TOKEN not configured. Redis sync will be disabled.');
}

const redisSyncService = {
  /**
   * A helper function to make authenticated requests to the Cloud Run API.
   */
  async makeRequest(method, endpoint, data = null) {
    if (!CLOUD_RUN_API_URL || !INTERNAL_API_TOKEN) {
      return { success: false, message: 'Redis sync service is not configured.' };
    }
    try {
      const response = await axios({
        method,
        url: `${CLOUD_RUN_API_URL}${endpoint}`,
        data,
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Token': INTERNAL_API_TOKEN,
        },
        timeout: 5000,
      });
      return { success: true, data: response.data };
    } catch (error) {
      console.error(`Redis proxy error (${method} ${endpoint}):`, error.message);
      return { success: false, message: error.response?.data?.detail || 'Failed to connect to Redis proxy.' };
    }
  },

  /**
   * Registers a new API key by calling the Cloud Run endpoint.
   */
  async registerApiKey(apiKeyData) {
    return this.makeRequest('POST', '/redis/api-key', {
      api_key: apiKeyData.key,
      // This is the fix: We explicitly convert the user_id to a string
      // to match what the FastAPI service expects.
      user_id: String(apiKeyData.user_id),
      credits: apiKeyData.credits || 0,
      active: apiKeyData.active !== false,
    });
  },

  /**
   * Deletes an API key by calling the Cloud Run endpoint.
   */
  async deleteApiKey(apiKey) {
    return this.makeRequest('DELETE', `/redis/api-key/${apiKey}`);
  },

  /**
   * Updates credits for ALL active API keys belonging to a user.
   */
  async updateCredits(userId, credits) {
    try {
      const { rows: keys } = await pool.query(
        'SELECT key FROM api_keys WHERE user_id = $1 AND active = true',
        [userId]
      );

      if (keys.length === 0) {
        return { success: true, message: 'No active keys to update in Redis.' };
      }

      const updatePromises = keys.map(apiKeyRecord => 
        this.makeRequest('PATCH', `/redis/credits/${apiKeyRecord.key}`, { credits })
      );

      await Promise.all(updatePromises);
      
      console.log(`Successfully synced credit update for ${keys.length} API key(s) for user ${userId}.`);
      return { success: true, message: 'User credits synced to Redis.' };

    } catch (error) {
      console.error(`Failed to sync credits for user ${userId}:`, error);
      return { success: false, message: 'Failed to sync user credits.' };
    }
  },
};

module.exports = { redisSyncService };