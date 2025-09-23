// This service acts as a client for your external FastAPI Redis API.
// It centralizes the logic for making secure, internal API calls.

const CLOUD_RUN_API_URL = process.env.CLOUD_RUN_API_URL;
const INTERNAL_API_TOKEN = process.env.INTERNAL_API_TOKEN;

/**
 * A helper function to make authenticated requests to the Cloud Run API.
 * @param method The HTTP method (e.g., 'PATCH', 'POST', 'DELETE').
 * @param endpoint The API endpoint path (e.g., '/redis/api-key/some_key').
 * @param data The JSON data to send in the request body.
 * @returns The response data from the API.
 */
async function makeRequest(method: string, endpoint: string, body?: any) {
  const url = `${process.env.REDIS_SYNC_URL}${endpoint}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  const internalToken = process.env.REDIS_SYNC_TOKEN;
  if (internalToken) {
    headers['x-internal-token'] = internalToken;
  }

  try {
    const res = await fetch(url, {
      method,
      headers,
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });

    if (!res.ok) {
      // If the response is not OK, we try to get a detailed error message.
      let errorMessage = `HTTP error! Status: ${res.status}`;
      try {
        const errorBody = await res.json();
        // FastAPI sends detailed validation errors in a 'detail' array.
        if (Array.isArray(errorBody.detail)) {
          // Format the detailed error messages into a readable string.
          const details = errorBody.detail.map((err: any) => 
            `Field '${err.loc[1]}' - ${err.msg}`
          ).join(', ');
          errorMessage = `Validation failed: ${details}`;
        } else if (errorBody.error) {
          // Handle other generic error formats.
          errorMessage = errorBody.error;
        }
      } catch (e) {
        // If the body can't be parsed, we stick with the original HTTP error.
      }
      // Throw the detailed, informative error.
      throw new Error(errorMessage);
    }

    // For non-error responses that might not have a body (like 204 No Content).
    if (res.status === 204) {
      return null;
    }
    
    return await res.json();

  } catch (error: any) {
    console.error(`Redis proxy client error (${method} ${endpoint}):`, error.message);
    throw error;
  }
}

/**
 * This is the exported service object containing all the methods
 * for interacting with your Redis API.
 */
export const redisSyncService = {
  /**
   * Updates credits for all API keys belonging to a user
   * @param userId - The user whose API keys need credit updates
   * @param credits - The new credit amount
   */
  async updateUserCredits(userId: string, credits: number) {
    const { db } = await import('@/lib/drizzle');
    const { apiKeys } = await import('@/shared/schema');
    const { eq } = await import('drizzle-orm');
    
    const userApiKeys = await db.query.apiKeys.findMany({
      where: eq(apiKeys.userId, userId),
      columns: { key: true }
    });

    const updatePromises = userApiKeys.map(apiKey => 
      this.updateApiKeyCredits(apiKey.key, credits)
    );

    return Promise.all(updatePromises);
  },

  /**
   * Updates credits for a specific API key
   * @param apiKey - The API key to update
   * @param credits - The new credit amount
   */
  async updateApiKeyCredits(apiKey: string, credits: number) {
    return makeRequest('PATCH', `/redis/api-key/${encodeURIComponent(apiKey)}/credits`, {
      credits
    });
  },

  /**
   * Registers a new API key in Redis via the FastAPI service.
   */
  async registerApiKey(apiKeyData: { api_key: string; user_id: string; credits: number; active: boolean; }) {
    return makeRequest('POST', '/redis/api-key', apiKeyData);
  },

  /**
   * Deletes an API key from Redis by calling the FastAPI service.
   * @param apiKey The API key string to delete.
   */
  async deleteApiKey(apiKey: string) {
    return makeRequest('DELETE', `/redis/api-key/${encodeURIComponent(apiKey)}`);
  },

  /**
   * Updates the active status of an API key
   * @param apiKey - The API key to update
   * @param active - Whether the key should be active
   */
  async updateApiKeyStatus(apiKey: string, active: boolean) {
    return makeRequest('PATCH', `/redis/api-key/${encodeURIComponent(apiKey)}/status`, {
      active
    });
  }
};

function registerApiKey(apiKeyData: { api_key: string; user_id: string; credits: number; active: boolean; }, arg1: { api_key: any; user_id: any; credits: any; active: any; }) {
    throw new Error('Function not implemented.');
  }
