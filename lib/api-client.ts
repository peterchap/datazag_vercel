/**
 * API client for interacting with the API Gateway
 * 
 * This module provides a consistent interface for communicating with the 
 * external API Gateway service that connects to the database.
 */
// We'll use a more direct approach for now
// import { apiGateway } from './api-gateway-client';

// Simple API Gateway client implementation
const apiGateway = {
  getBaseUrl: () => process.env.NEXT_PUBLIC_API_GATEWAY_URL || 'http://localhost:3000',
  isConfigured: () => Boolean(process.env.NEXT_PUBLIC_API_GATEWAY_URL),
  setApiKey: (_apiKey: string) => {/* Implementation will be added later */},
  clearApiKey: () => {/* Implementation will be added later */},
  
  // Basic request implementation
  async get(path: string) {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_GATEWAY_URL || 'http://localhost:3000';
      const response = await fetch(`${baseUrl}${path}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
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
  },
  
  // Simple implementation for health check
  async checkHealth() {
    return this.get('/health');
  },
  
  // Other methods (post, put, delete) would be implemented similarly
  async post(path: string, data?: any) {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_GATEWAY_URL || 'http://localhost:3000';
      const response = await fetch(`${baseUrl}${path}`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: data ? JSON.stringify(data) : undefined
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
  },
  
  async put(path: string, data?: any) {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_GATEWAY_URL || 'http://localhost:3000';
      const response = await fetch(`${baseUrl}${path}`, {
        method: 'PUT',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: data ? JSON.stringify(data) : undefined
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
  },
  
  async delete(path: string, data?: any) {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_GATEWAY_URL || 'http://localhost:3000';
      const response = await fetch(`${baseUrl}${path}`, {
        method: 'DELETE',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: data ? JSON.stringify(data) : undefined
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
};

// For backward compatibility
export const API_GATEWAY_URL = apiGateway.getBaseUrl();

/**
 * Makes an authenticated request to the API Gateway
 * 
 * This is the legacy function that wraps our new API Gateway client
 * for backward compatibility with existing code.
 */
export async function apiGatewayRequest(
  method: string,
  endpoint: string,
  data?: any,
  token?: string
) {
  // Set the API key if provided
  if (token) {
    apiGateway.setApiKey(token);
  }

  try {
    console.log(`Sending ${method} request to ${API_GATEWAY_URL}${endpoint}`);
    
    let result;
    switch (method.toUpperCase()) {
      case 'GET':
        result = await apiGateway.get(endpoint);
        break;
      case 'POST':
        result = await apiGateway.post(endpoint, data);
        break;
      case 'PUT':
        result = await apiGateway.put(endpoint, data);
        break;
      case 'DELETE':
        result = await apiGateway.delete(endpoint, data);
        break;
      default:
        throw new Error(`Unsupported method: ${method}`);
    }

    // Clear the API key after use
    if (token) {
      apiGateway.clearApiKey();
    }

    if (!result.success) {
      throw new Error(result.error?.message || `API Gateway request failed with status: ${result.statusCode}`);
    }

    return result.data;
  } catch (error) {
    console.error(`API Gateway request failed for ${endpoint}:`, error);
    throw error;
  }
}

/**
 * Check if the API Gateway is available
 */
export async function checkApiGatewayAvailability(): Promise<boolean> {
  try {
    const healthCheck = await apiGateway.checkHealth();
    return healthCheck.success;
  } catch (error) {
    console.error('API Gateway health check failed:', error);
    return false;
  }
}

/**
 * Get detailed API Gateway status information
 */
export async function getApiGatewayStatus() {
  try {
    const result = await apiGateway.checkHealth();
    return {
      available: result.success,
      status: result.success ? 'online' : 'offline',
      statusCode: result.statusCode,
      details: result.data,
      error: result.error
    };
  } catch (error) {
    return {
      available: false,
      status: 'error',
      statusCode: 0,
      error: {
        message: error instanceof Error ? error.message : String(error)
      }
    };
  }
}

/**
 * Get public credit bundles through the API Gateway
 */
export async function getCreditBundles() {
  return apiGatewayRequest('GET', '/api/credit-bundles');
}

/**
 * Login through the API Gateway
 */
export async function loginViaGateway(email: string, password: string) {
  console.log("loginViaGateway: Starting login request");
  const result = await apiGatewayRequest('POST', '/api/login', { email, password });
  console.log("loginViaGateway: Raw API Gateway response:", result);
  console.log("loginViaGateway: Response type:", typeof result);
  console.log("loginViaGateway: Response keys:", Object.keys(result || {}));
  
  // The API Gateway should return both user data and a JWT token
  if (result && typeof result === 'object') {
    let userData;
    let token;
    
    // Extract user data and token from API Gateway response format
    if (result.success && result.data) {
      // API Gateway returns: { success: true, data: { token: "...", user: {...} } }
      userData = result.data.user;
      token = result.data.token;
      console.log("loginViaGateway: Extracted from result.data - token exists:", !!token);
    } else if (result.user) {
      // Fallback format: { user: {...}, token: "..." }
      userData = result.user;
      token = result.token;
      console.log("loginViaGateway: Extracted from result.user - token exists:", !!token);
    } else {
      // Direct format
      userData = result;
      token = result.token;
      console.log("loginViaGateway: Direct extraction - token exists:", !!token);
    }
    
    // If we have a token, add it to the user data for storage
    if (token && userData) {
      console.log("loginViaGateway: Found JWT token, adding to user data");
      userData.token = token;
    } else {
      console.warn("loginViaGateway: No JWT token found in response");
    }
    
    console.log("loginViaGateway: Final user data:", userData);
    return userData;
  }
  
  return result;
}

/**
 * Register through the API Gateway
 */
export async function registerViaGateway(userData: {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  company?: string;
}) {
  // Use same-origin API by default; avoid forcing CORS mode on same origin
  const tryRegister = async (path: string) => {
    const res = await fetch(path, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify(userData)
    });
    return res;
  };

  // Prefer the stable signup route first; fall back to /api/register
  let response = await tryRegister('/api/auth/signup');
  if (response.status === 404 || response.status === 405) {
    response = await tryRegister('/api/register');
  }

  // Bubble up any remaining error with details
  if (!response.ok) {
    let details = '';
    try { details = await response.text(); } catch { /* ignore */ }
    throw new Error(`Registration failed: ${response.status}${details ? ' ' + details : ''}`);
  }

  // Normalize user shape regardless of which endpoint handled the request
  const payload = await response.json();
  let user: any = payload;
  if (payload && payload.user) user = payload.user;

  // Map snake_case fields if present
  const normalized = {
    id: String(user.id ?? user.user_id ?? ''),
    email: user.email ?? '',
    firstName: user.firstName ?? user.first_name ?? '',
    lastName: user.lastName ?? user.last_name ?? '',
    company: user.company ?? '',
    role: user.role ?? 'USER',
    credits: user.credits ?? 0,
  };

  return normalized;
}