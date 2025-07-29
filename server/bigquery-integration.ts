import axios from 'axios';
import { ApiKey, ApiUsage } from '@shared/schema';

// Check for required environment variables
const FASTAPI_SERVICE_URL = process.env.FASTAPI_SERVICE_URL;
const API_SERVICE_KEY = process.env.API_SERVICE_KEY;

// Define interface for detailed API usage metrics
export interface ApiUsageMetrics {
  rowsProcessed?: number;
  computeTimeMs?: number;
  dataTransferredBytes?: number;
  queryComplexity?: 'low' | 'medium' | 'high' | 'very_high';
  [key: string]: any; // Allow for additional metrics
}

/**
 * Service for communicating with the FastAPI BigQuery service
 */
export const bigQueryService = {
  /**
   * Register an API key with the BigQuery service
   */
  async registerApiKey(apiKey: ApiKey): Promise<boolean> {
    if (!FASTAPI_SERVICE_URL || !API_SERVICE_KEY) {
      console.error("Missing required environment variables for BigQuery service");
      return false;
    }

    try {
      const response = await axios.post(
        `${FASTAPI_SERVICE_URL}/api/register-key`, 
        {
          keyId: apiKey.id,
          userId: apiKey.userId,
          key: apiKey.key,
          name: apiKey.name,
          createdAt: apiKey.createdAt
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${API_SERVICE_KEY}`
          }
        }
      );
      
      return response.status === 201 || response.status === 200;
    } catch (error: any) {
      console.error("Error registering API key with BigQuery service:", error.message);
      return false;
    }
  },

  /**
   * Deactivate an API key in the BigQuery service
   */
  async deactivateApiKey(keyId: number): Promise<boolean> {
    if (!FASTAPI_SERVICE_URL || !API_SERVICE_KEY) {
      console.error("Missing required environment variables for BigQuery service");
      return false;
    }

    try {
      const response = await axios.post(
        `${FASTAPI_SERVICE_URL}/api/deactivate-key`,
        { keyId },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${API_SERVICE_KEY}`
          }
        }
      );
      
      return response.status === 200;
    } catch (error: any) {
      console.error("Error deactivating API key in BigQuery service:", error.message);
      return false;
    }
  },

  /**
   * Get usage data for a specific API key
   */
  async getApiKeyUsage(keyId: number, startDate?: string, endDate?: string): Promise<any> {
    if (!FASTAPI_SERVICE_URL || !API_SERVICE_KEY) {
      console.error("Missing required environment variables for BigQuery service");
      return null;
    }

    try {
      const params: any = { keyId };
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const response = await axios.get(
        `${FASTAPI_SERVICE_URL}/api/key-usage`,
        {
          params,
          headers: {
            'Authorization': `Bearer ${API_SERVICE_KEY}`
          }
        }
      );
      
      return response.data;
    } catch (error: any) {
      console.error("Error fetching API key usage from BigQuery service:", error.message);
      return null;
    }
  },

  /**
   * Get usage data for a specific user (all their API keys)
   */
  async getUserApiUsage(userId: number, startDate?: string, endDate?: string): Promise<any> {
    if (!FASTAPI_SERVICE_URL || !API_SERVICE_KEY) {
      console.error("Missing required environment variables for BigQuery service");
      return null;
    }

    try {
      const params: any = { userId };
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const response = await axios.get(
        `${FASTAPI_SERVICE_URL}/api/user-usage`,
        {
          params,
          headers: {
            'Authorization': `Bearer ${API_SERVICE_KEY}`
          }
        }
      );
      
      return response.data;
    } catch (error: any) {
      console.error("Error fetching user API usage from BigQuery service:", error.message);
      return null;
    }
  },

  /**
   * Record a new API usage event with detailed metrics
   */
  async recordApiUsage(usageData: ApiUsage, metrics?: ApiUsageMetrics): Promise<boolean> {
    if (!FASTAPI_SERVICE_URL || !API_SERVICE_KEY) {
      console.error("Missing required environment variables for BigQuery service");
      return false;
    }

    try {
      const payload: any = {
        apiKeyId: usageData.apiKeyId,
        userId: usageData.userId,
        endpoint: usageData.endpoint,
        responseTime: usageData.responseTime,
        status: usageData.status || "success",
        timestamp: usageData.createdAt ? new Date(usageData.createdAt).toISOString() : new Date().toISOString()
      };

      // If we have detailed metrics, include them
      if (metrics) {
        payload.metrics = metrics;
      } 
      // Otherwise, include the credits directly for backward compatibility
      else if (usageData.credits) {
        payload.credits = usageData.credits;
      }

      const response = await axios.post(
        `${FASTAPI_SERVICE_URL}/api/record-usage`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${API_SERVICE_KEY}`
          }
        }
      );
      
      return response.status === 201 || response.status === 200;
    } catch (error: any) {
      console.error("Error recording API usage with BigQuery service:", error.message);
      return false;
    }
  },

  /**
   * Report an API usage issue
   */
  async reportIssue(userId: number, apiKeyId: number, description: string, metadata: any): Promise<boolean> {
    if (!FASTAPI_SERVICE_URL || !API_SERVICE_KEY) {
      console.error("Missing required environment variables for BigQuery service");
      return false;
    }

    try {
      const response = await axios.post(
        `${FASTAPI_SERVICE_URL}/api/report-issue`,
        {
          userId,
          apiKeyId,
          description,
          metadata,
          timestamp: new Date().toISOString()
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${API_SERVICE_KEY}`
          }
        }
      );
      
      return response.status === 201 || response.status === 200;
    } catch (error: any) {
      console.error("Error reporting issue to BigQuery service:", error.message);
      return false;
    }
  },

  /**
   * Get pending issues for a specific user or all users
   */
  async getIssues(userId?: number, status?: string): Promise<any> {
    if (!FASTAPI_SERVICE_URL || !API_SERVICE_KEY) {
      console.error("Missing required environment variables for BigQuery service");
      return null;
    }

    try {
      const params: any = {};
      if (userId) params.userId = userId;
      if (status) params.status = status;

      const response = await axios.get(
        `${FASTAPI_SERVICE_URL}/api/issues`,
        {
          params,
          headers: {
            'Authorization': `Bearer ${API_SERVICE_KEY}`
          }
        }
      );
      
      return response.data;
    } catch (error: any) {
      console.error("Error fetching issues from BigQuery service:", error.message);
      return null;
    }
  },

  /**
   * Test connection to the FastAPI service
   */
  async testConnection(): Promise<boolean> {
    if (!FASTAPI_SERVICE_URL || !API_SERVICE_KEY) {
      console.error("Missing required environment variables for BigQuery service");
      return false;
    }

    try {
      const response = await axios.get(
        `${FASTAPI_SERVICE_URL}/api/health`,
        {
          headers: {
            'Authorization': `Bearer ${API_SERVICE_KEY}`
          },
          timeout: 5000 // 5 second timeout
        }
      );
      
      return response.status === 200;
    } catch (error: any) {
      console.error("Error testing connection to BigQuery service:", error.message);
      return false;
    }
  }
};