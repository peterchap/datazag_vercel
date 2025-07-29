/**
 * Redis Sync Service
 * 
 * Service for syncing data to Redis cache for high-performance
 * API key validation and credit checking.
 */

const REDIS_API_URL = process.env.REDIS_API_URL;
const INTERNAL_API_TOKEN = process.env.INTERNAL_API_TOKEN;

interface RedisResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

class RedisSyncService {
  private async makeRequest<T = any>(method: string, endpoint: string, data?: any): Promise<RedisResponse<T>> {
    if (!REDIS_API_URL || !INTERNAL_API_TOKEN) {
      console.warn('Redis API not configured - skipping Redis sync');
      return {
        success: false,
        message: 'Redis API not configured',
        error: 'Missing REDIS_API_URL or INTERNAL_API_TOKEN'
      };
    }

    try {
      const response = await fetch(`${REDIS_API_URL}${endpoint}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-internal-token': INTERNAL_API_TOKEN,
        },
        body: data ? JSON.stringify(data) : undefined
      });

      // Handle 404 as Redis service not available
      if (response.status === 404) {
        console.warn(`Redis endpoint ${endpoint} not found - Redis service may not be running`);
        return {
          success: false,
          message: 'Redis service unavailable',
          error: 'Endpoint not found'
        };
      }

      const result = await response.json();
      
      if (!response.ok) {
        return {
          success: false,
          message: result.message || 'Request failed',
          error: result.error
        };
      }

      return {
        success: true,
        data: result.data || result
      };
    } catch (error) {
      console.warn(`Redis API request failed: ${method} ${endpoint}`, error);
      return {
        success: false,
        message: 'Redis API unreachable',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // API Key operations
  async registerApiKey(apiKeyData: { apiKey: string; userId: number; active: boolean }) {
    const payload = {
      api_key: apiKeyData.apiKey,
      user_id: apiKeyData.userId.toString(),
      credits: 1000, // Default credits, will be updated separately
      active: apiKeyData.active
    };
    
    return this.makeRequest('POST', '/redis/api-key', payload);
  }

  async deleteApiKey(apiKey: string) {
    return this.makeRequest('DELETE', `/redis/api-key/${apiKey}`);
  }

  async getApiKey(apiKey: string) {
    return this.makeRequest('GET', `/redis/key_exists/${apiKey}`);
  }

  // Credit operations
  async updateCredits(userId: number, credits: number) {
    try {
      const storage = await this.importStorage();
      
      // First, find the API key for this user
      const user = await storage.getUser(userId);
      if (!user) {
        return { success: false, message: 'User not found' };
      }

      const userApiKeys = await storage.getUserApiKeys(userId);
      if (userApiKeys.length === 0) {
        return { success: false, message: 'No API keys found for user' };
      }

      // Update credits for the first active API key
      const activeKey = userApiKeys.find(k => k.active);
      if (!activeKey) {
        return { success: false, message: 'No active API key found' };
      }

      const payload = { credits };
      return this.makeRequest('PATCH', `/redis/credits/${activeKey.key}`, payload);
    } catch (error) {
      return { success: false, message: `Error updating credits: ${error.message}` };
    }
  }

  async getCredits(apiKey: string) {
    return this.makeRequest('GET', `/redis/get_credits/${apiKey}`);
  }

  // Import storage after the service is defined
  private async importStorage() {
    if (!this.storageInstance) {
      const { storage } = await import('./storage');
      this.storageInstance = storage;
    }
    return this.storageInstance;
  }

  private storageInstance: any;

  // Health check
  async healthCheck() {
    return this.makeRequest('GET', '/ping');
  }

  // Get Redis sync status
  async getSyncStatus() {
    return this.makeRequest('GET', '/redis/sync-status');
  }

  // Clear Redis cache  
  async flushDatabase() {
    return this.makeRequest('POST', '/redis/flushdb');
  }
}

export const redisSyncService = new RedisSyncService();