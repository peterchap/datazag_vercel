/**
 * API Gateway Client
 * 
 * This module provides a consistent interface for communicating with the API Gateway
 * and handles configuration, request formatting, authentication, and error handling.
 */

/**
 * Configuration for the API Gateway client
 */
interface ApiGatewayConfig {
  baseUrl: string;
  timeout?: number;
  defaultHeaders?: Record<string, string>;
}

/**
 * Response from the API Gateway
 */
interface ApiGatewayResponse<T> {
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
 * Default client configuration
 */
const DEFAULT_CONFIG: ApiGatewayConfig = {
  baseUrl: import.meta.env.VITE_API_GATEWAY_URL || '',
  timeout: 30000, // 30 seconds
  defaultHeaders: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  }
};

/**
 * The API Gateway Client
 */
class ApiGatewayClient {
  private config: ApiGatewayConfig;
  private apiKey: string | null = null;

  constructor(config: Partial<ApiGatewayConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    // Validate configuration
    if (!this.config.baseUrl) {
      console.warn(
        'API Gateway URL not configured. Please set VITE_API_GATEWAY_URL in your environment.'
      );
    }
  }

  /**
   * Set the API key for authenticated requests
   */
  setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
  }

  /**
   * Clear the API key
   */
  clearApiKey(): void {
    this.apiKey = null;
  }

  /**
   * Check if the API Gateway is configured properly
   */
  isConfigured(): boolean {
    return Boolean(this.config.baseUrl);
  }

  /**
   * Get the base URL
   */
  getBaseUrl(): string {
    return this.config.baseUrl;
  }

  /**
   * Perform a health check on the API Gateway
   */
  async checkHealth(): Promise<ApiGatewayResponse<{ status: string }>> {
    return this.get('/health');
  }

  /**
   * Make a GET request to the API Gateway
   */
  async get<T>(path: string, params?: Record<string, string>): Promise<ApiGatewayResponse<T>> {
    return this.request<T>('GET', path, { params });
  }

  /**
   * Make a POST request to the API Gateway
   */
  async post<T>(path: string, data?: any): Promise<ApiGatewayResponse<T>> {
    return this.request<T>('POST', path, { data });
  }

  /**
   * Make a PUT request to the API Gateway
   */
  async put<T>(path: string, data?: any): Promise<ApiGatewayResponse<T>> {
    return this.request<T>('PUT', path, { data });
  }

  /**
   * Make a DELETE request to the API Gateway
   */
  async delete<T>(path: string, data?: any): Promise<ApiGatewayResponse<T>> {
    return this.request<T>('DELETE', path, { data });
  }

  /**
   * Make a request to the API Gateway
   */
  private async request<T>(
    method: string,
    path: string,
    options: {
      params?: Record<string, string>;
      data?: any;
      headers?: Record<string, string>;
    } = {}
  ): Promise<ApiGatewayResponse<T>> {
    try {
      if (!this.isConfigured()) {
        return {
          success: false,
          error: {
            message: 'API Gateway URL not configured',
            code: 'API_GATEWAY_NOT_CONFIGURED',
          },
          statusCode: 0,
        };
      }

      // Build URL with query params
      let url = `${this.config.baseUrl}${path}`;
      if (options.params) {
        const queryParams = new URLSearchParams();
        Object.entries(options.params).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            queryParams.append(key, String(value));
          }
        });
        const queryString = queryParams.toString();
        if (queryString) {
          url = `${url}?${queryString}`;
        }
      }

      // Build headers
      const headers = {
        ...this.config.defaultHeaders,
        ...options.headers,
      };

      // Add API key if present
      if (this.apiKey) {
        headers['X-API-Key'] = this.apiKey;
      }

      // Build fetch options
      const fetchOptions: RequestInit = {
        method,
        headers,
        credentials: 'include', // Include cookies for session-based auth if needed
      };

      // Add body for POST, PUT, DELETE
      if (options.data && ['POST', 'PUT', 'DELETE'].includes(method)) {
        fetchOptions.body = JSON.stringify(options.data);
      }

      // Add timeout
      const timeoutPromise = new Promise<Response>((_, reject) => {
        setTimeout(() => {
          reject(new Error('Request timeout'));
        }, this.config.timeout);
      });

      // Make the request with timeout
      const response = await Promise.race([
        fetch(url, fetchOptions),
        timeoutPromise,
      ]);

      const statusCode = response.status;

      // Try to parse JSON response
      let data: any;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      // Handle success
      if (response.ok) {
        return {
          success: true,
          data: data as T,
          statusCode,
        };
      }

      // Handle error
      return {
        success: false,
        error: {
          message: data.message || 'Unknown error',
          code: data.code,
          details: data.details,
        },
        statusCode,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : String(error),
          code: 'REQUEST_FAILED',
        },
        statusCode: 0,
      };
    }
  }
}

// Export a singleton instance
export const apiGateway = new ApiGatewayClient();

// Also export the class for testing or custom instances
export default ApiGatewayClient;