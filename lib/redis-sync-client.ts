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
async function makeRequest(method: string, endpoint: string, data: any = null) {
  if (!CLOUD_RUN_API_URL || !INTERNAL_API_TOKEN) {
    console.warn('Redis sync is disabled. CLOUD_RUN_API_URL or INTERNAL_API_TOKEN is not configured.');
    return { success: false, message: 'Redis sync service is not configured.' };
  }

  try {
    const response = await fetch(`${CLOUD_RUN_API_URL}${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Token': INTERNAL_API_TOKEN,
      },
      body: data ? JSON.stringify(data) : undefined,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || `Request failed with status ${response.status}`);
    }

    // Some DELETE requests might not have a body, so we handle that case.
    if (response.status === 204) {
        return { success: true, data: { message: 'Deleted successfully.' } };
    }
    return { success: true, data: await response.json() };
    
  } catch (error) {
    console.error(`Redis proxy client error (${method} ${endpoint}):`, error);
    throw error;
  }
}

/**
 * This is the exported service object containing all the methods
 * for interacting with your Redis API.
 */
export const redisSyncService = {
  /**
   * Updates credits for a user by calling the dedicated Cloud Run endpoint.
   */
  async updateCredits(userId: number, credits: number) {
    return makeRequest('PATCH', `/redis/credits/user/${userId}`, {
      credits
    });
  },
  
  /**
   * Registers a new API key in Redis via the FastAPI service.
   */
  async registerApiKey(apiKeyData: { key: string; user_id: number; credits: number; active: boolean; }) {
    return makeRequest('POST', '/redis/api-key', {
        api_key: apiKeyData.key,
        user_id: String(apiKeyData.user_id),
        credits: apiKeyData.credits,
        active: apiKeyData.active,
    });
  },

  /**
   * This is the new function that was missing.
   * It deletes an API key from Redis by calling the FastAPI service.
   * @param apiKey The API key string to delete.
   */
  async deleteApiKey(apiKey: string) {
    return makeRequest('DELETE', `/redis/api-key/${apiKey}`);
  },
};