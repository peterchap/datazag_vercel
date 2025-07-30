/**
 * API Services Configuration
 * 
 * This module provides a central configuration for accessing different API services:
 * - API Gateway (PostgreSQL data operations)
 * - API Service (BigQuery operations)
 */

// Get API URLs from environment variables
export const API_GATEWAY_URL = process.env.NEXT_PUBLIC_API_GATEWAY_URL || 'http://localhost:3000';
export const API_SERVICE_URL = process.env.NEXT_PUBLIC_API_SERVICE_URL || 'http://localhost:4000';

/**
 * Response interface for all API operations
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
    details?: any;
  };
  statusCode: number;
}

/**
 * Base API client with common functionality
 */
class BaseApiClient {
  protected baseUrl: string;
  protected apiKey: string | null = null;
  
  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }
  
  /**
   * Set API key for authenticated requests
   */
  setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
  }
  
  /**
   * Clear API key
   */
  clearApiKey(): void {
    this.apiKey = null;
  }
  
  /**
   * Check if configured
   */
  isConfigured(): boolean {
    return Boolean(this.baseUrl);
  }
  
  /**
   * Get base URL
   */
  getBaseUrl(): string {
    return this.baseUrl;
  }
  
  /**
   * Make a GET request
   */
  async get<T = any>(path: string, params?: Record<string, string>): Promise<ApiResponse<T>> {
    try {
      // Build URL with query params
      let url = `${this.baseUrl}${path}`;
      if (params) {
        const queryParams = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            queryParams.append(key, String(value));
          }
        });
        const queryString = queryParams.toString();
        if (queryString) {
          url = `${url}?${queryString}`;
        }
      }
      
      // Set up headers
      const headers: HeadersInit = {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      };
      
      // Add API key if present
      if (this.apiKey) {
        headers['X-API-Key'] = this.apiKey;
      }
      
      const response = await fetch(url, {
        method: 'GET',
        headers,
        credentials: 'include'
      });
      
      if (response.ok) {
        const contentType = response.headers.get('content-type');
        const data = contentType?.includes('application/json') 
          ? await response.json()
          : await response.text();
          
        return {
          success: true,
          data,
          statusCode: response.status
        };
      }
      
      return {
        success: false,
        error: { message: response.statusText },
        statusCode: response.status
      };
    } catch (error) {
      return {
        success: false,
        error: { message: error instanceof Error ? error.message : String(error) },
        statusCode: 0
      };
    }
  }
  
  /**
   * Make a POST request
   */
  async post<T = any>(path: string, data?: any): Promise<ApiResponse<T>> {
    try {
      const headers: HeadersInit = {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      };
      
      if (this.apiKey) {
        headers['X-API-Key'] = this.apiKey;
      }
      
      const response = await fetch(`${this.baseUrl}${path}`, {
        method: 'POST',
        headers,
        body: data ? JSON.stringify(data) : undefined,
        credentials: 'include'
      });
      
      if (response.ok) {
        const contentType = response.headers.get('content-type');
        const responseData = contentType?.includes('application/json') 
          ? await response.json()
          : await response.text();
          
        return {
          success: true,
          data: responseData,
          statusCode: response.status
        };
      }
      
      return {
        success: false,
        error: { message: response.statusText },
        statusCode: response.status
      };
    } catch (error) {
      return {
        success: false,
        error: { message: error instanceof Error ? error.message : String(error) },
        statusCode: 0
      };
    }
  }
  
  /**
   * Make a PUT request
   */
  async put<T = any>(path: string, data?: any): Promise<ApiResponse<T>> {
    try {
      const headers: HeadersInit = {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      };
      
      if (this.apiKey) {
        headers['X-API-Key'] = this.apiKey;
      }
      
      const response = await fetch(`${this.baseUrl}${path}`, {
        method: 'PUT',
        headers,
        body: data ? JSON.stringify(data) : undefined,
        credentials: 'include'
      });
      
      if (response.ok) {
        const contentType = response.headers.get('content-type');
        const responseData = contentType?.includes('application/json') 
          ? await response.json()
          : await response.text();
          
        return {
          success: true,
          data: responseData,
          statusCode: response.status
        };
      }
      
      return {
        success: false,
        error: { message: response.statusText },
        statusCode: response.status
      };
    } catch (error) {
      return {
        success: false,
        error: { message: error instanceof Error ? error.message : String(error) },
        statusCode: 0
      };
    }
  }
  
  /**
   * Make a DELETE request
   */
  async delete<T = any>(path: string, data?: any): Promise<ApiResponse<T>> {
    try {
      const headers: HeadersInit = {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      };
      
      if (this.apiKey) {
        headers['X-API-Key'] = this.apiKey;
      }
      
      const response = await fetch(`${this.baseUrl}${path}`, {
        method: 'DELETE',
        headers,
        body: data ? JSON.stringify(data) : undefined,
        credentials: 'include'
      });
      
      if (response.ok) {
        const contentType = response.headers.get('content-type');
        const responseData = contentType?.includes('application/json') 
          ? await response.json()
          : await response.text();
          
        return {
          success: true,
          data: responseData,
          statusCode: response.status
        };
      }
      
      return {
        success: false,
        error: { message: response.statusText },
        statusCode: response.status
      };
    } catch (error) {
      return {
        success: false,
        error: { message: error instanceof Error ? error.message : String(error) },
        statusCode: 0
      };
    }
  }
}

/**
 * API Gateway Client - for PostgreSQL data operations
 */
class ApiGatewayClient extends BaseApiClient {
  constructor() {
    super(API_GATEWAY_URL);
    if (!this.isConfigured()) {
      console.warn('API Gateway URL not configured. Please set NEXT_PUBLIC_API_GATEWAY_URL in your environment.');
    }
  }
  
  /**
   * Check health of the API Gateway
   */
  async checkHealth(): Promise<ApiResponse<{ status: string }>> {
    return this.get('/health');
  }
  
  /**
   * Get credit bundles
   */
  async getCreditBundles() {
    return this.get('/api/credit-bundles');
  }
  
  /**
   * Login user
   */
  async login(email: string, password: string) {
    return this.post('/api/login', { email, password });
  }
  
  /**
   * Register new user
   */
  async register(userData: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    company?: string;
  }) {
    return this.post('/api/register', userData);
  }
}

/**
 * API Service Client - for BigQuery operations
 */
class ApiServiceClient extends BaseApiClient {
  constructor() {
    super(API_SERVICE_URL);
    if (!this.isConfigured()) {
      console.warn('API Service URL not configured. Please set NEXT_PUBLIC_API_SERVICE_URL in your environment.');
    }
  }
  
  /**
   * Check health of the API Service
   */
  async checkHealth(): Promise<ApiResponse<{ status: string }>> {
    return this.get('/health');
  }
  
  /**
   * Verify API key
   */
  async verifyApiKey(apiKey: string) {
    return this.post('/api/verify-key', { apiKey });
  }
  
  /**
   * Get query usage metrics
   */
  async getQueryUsage(userId: number, startDate?: string, endDate?: string) {
    return this.get('/api/usage', {
      userId: userId.toString(),
      ...(startDate && { startDate }),
      ...(endDate && { endDate })
    });
  }
}

// Export singleton instances
export const apiGateway = new ApiGatewayClient();
export const apiService = new ApiServiceClient();

// Backward compatibility with existing code
export default {
  apiGateway,
  apiService
};
