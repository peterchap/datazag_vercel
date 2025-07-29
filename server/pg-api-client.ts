/**
 * PostgreSQL API Client
 * 
 * Client for communicating with the PG_API microservice
 * that handles all database operations.
 */

const PG_API_URL = process.env.PG_API_URL;
const INTERNAL_API_TOKEN = process.env.INTERNAL_API_TOKEN;

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

class PgApiClient {
  private async makeRequest<T = any>(method: string, endpoint: string, data?: any): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${PG_API_URL}${endpoint}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${INTERNAL_API_TOKEN}`,
        },
        body: data ? JSON.stringify(data) : undefined
      });

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
      console.error(`PG API request failed: ${method} ${endpoint}`, error);
      return {
        success: false,
        message: 'Network error',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // User operations
  async getUser(userId: number) {
    return this.makeRequest('GET', `/api/users/${userId}`);
  }

  async getAllUsers() {
    return this.makeRequest('GET', '/api/users');
  }

  async updateUser(userId: number, data: any) {
    return this.makeRequest('PATCH', `/api/users/${userId}`, data);
  }

  async createUser(userData: any) {
    return this.makeRequest('POST', '/api/users', userData);
  }

  // API Key operations
  async getAllApiKeys() {
    return this.makeRequest('GET', '/api/keys');
  }

  async createApiKey(keyData: any) {
    return this.makeRequest('POST', '/api/keys', keyData);
  }

  async deleteApiKey(keyId: number) {
    return this.makeRequest('DELETE', `/api/keys/${keyId}`);
  }

  // API Usage operations
  async createApiUsage(usageData: any) {
    return this.makeRequest('POST', '/api/usage', usageData);
  }

  async getUserUsage(userId: number, startDate?: string, endDate?: string) {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.makeRequest('GET', `/api/users/${userId}/usage${query}`);
  }

  // Credit operations
  async addUserCredits(userId: number, amount: number, transactionData?: any) {
    return this.makeRequest('POST', `/api/users/${userId}/credits`, {
      amount,
      transaction: transactionData
    });
  }

  // Health check
  async healthCheck() {
    return this.makeRequest('GET', '/health');
  }
}

export const pgApiClient = new PgApiClient();