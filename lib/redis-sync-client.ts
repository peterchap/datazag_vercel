// redis-sync-service.ts
import axios from 'axios';

// ---------- Types ----------
export type ServiceResult<T = unknown> = {
  success: boolean;
  statusCode: number;
  message: string;
  data?: T;
};

export type ApiKeyData = {
  key: string;
  user_id: string | number;
  credits?: number;
  active?: boolean;
};

export type ApiKeyRegisterPayload = {
  api_key: string;
  user_id: string;
  credits: number;
  active: boolean;
};

// ---------- Env & guards ----------
const REDIS_API_URL = process.env.REDIS_API_URL;

const INTERNAL_API_TOKEN = process.env.INTERNAL_API_TOKEN ?? '';

if (!INTERNAL_API_TOKEN) {
  console.warn('INTERNAL_API_TOKEN not configured - Redis sync will be disabled');
}

// Optional: ensure this never runs on the client
function ensureServerOnly() {
  if (typeof window !== 'undefined') {
    throw new Error('RedisSyncService must not be used in the browser.');
  }
}

// ---------- Helpers ----------
function toBool(v: unknown, fallback = true): boolean {
  if (v === undefined || v === null) return fallback;
  if (typeof v === 'boolean') return v;
  if (typeof v === 'string') return v.trim().toLowerCase() === 'true';
  if (typeof v === 'number') return v !== 0;
  return Boolean(v);
}

function toInt(v: unknown, fallback = 0): number {
  if (v === undefined || v === null || v === '') return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

function toStr(v: unknown, name: string): string {
  const s = (v ?? '').toString().trim();
  if (!s) throw new Error(`${name} is required`);
  return s;
}

function sanitize<T extends Record<string, any>>(obj: T): T {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== '') out[k] = v;
  }
  return out as T;
}

// ---------- Service ----------
export class RedisSyncService {
  constructor() {
    ensureServerOnly();
  }

  async makeRequest<T = any>(
    method: 'POST' | 'GET' | 'PUT' | 'PATCH' | 'DELETE',
    endpoint: string,
    body?: unknown
  ): Promise<ServiceResult<T>> {
    if (!INTERNAL_API_TOKEN) {
      console.warn('Redis sync skipped - INTERNAL_API_TOKEN not configured');
      return { success: false, statusCode: 503, message: 'Redis sync not configured' };
    }
    if (!REDIS_API_URL) {
      console.warn('Redis sync skipped - REDIS_API_URL not configured');
      return { success: false, statusCode: 503, message: 'Redis sync not configured' };
    }

    try {
      const response = await axios({
        method,
        url: `${REDIS_API_URL}${endpoint}`,
        data: body, // axios will JSON-encode objects
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Internal-Token': INTERNAL_API_TOKEN,
        },
        timeout: 10000,
        validateStatus: () => true, // always return; we normalize below
      });

      if (response.status >= 200 && response.status < 300) {
        return {
          success: true,
          statusCode: response.status,
          message: response.data?.message || 'Success',
          data: response.data as T,
        };
      }

      // Normalize FastAPI 422 detail (Pydantic errors)
      const detail = response.data?.detail;
      const msg =
        response.data?.message ||
        response.data?.detail ||
        response.statusText ||
        'Request failed';

      if (response.status === 422 && Array.isArray(detail)) {
        const friendly = detail
          .map((d: any) => {
            const loc = Array.isArray(d.loc) ? d.loc.join('.') : d.loc;
            return `${loc}: ${d.msg}`;
          })
          .join('; ');
        return { success: false, statusCode: 422, message: friendly, data: response.data as T };
      }

      if (response.status === 404) {
        return { success: false, statusCode: 404, message: 'Redis sync endpoint not available', data: response.data as T };
      }

      return {
        success: false,
        statusCode: response.status,
        message: msg,
        data: response.data as T,
      };
    } catch (error: any) {
      console.warn(`Redis sync error (${method} ${endpoint}):`, error?.message);
      if (error?.code === 'ECONNREFUSED' || error?.code === 'ENOTFOUND') {
        return { success: false, statusCode: 502, message: 'Cannot connect to Redis API' };
      }
      if (error?.code === 'ECONNABORTED') {
        return { success: false, statusCode: 504, message: 'Redis API timeout' };
      }
      return { success: false, statusCode: 500, message: 'Redis sync service error' };
    }
  }

  // ---- API methods ----

  async registerApiKey(
  apiKeyData: ApiKeyData | ApiKeyRegisterPayload
): Promise<ServiceResult> {
  const keyVal =
    (apiKeyData as any).key ?? (apiKeyData as any).api_key; // accept both

  const payload: ApiKeyRegisterPayload = sanitize({
    api_key: toStr(keyVal, 'api_key'),
    user_id: toStr((apiKeyData as any).user_id, 'user_id'),
    credits: toInt((apiKeyData as any).credits, 0),
    active: toBool((apiKeyData as any).active, true),
  });

  return this.makeRequest('POST', '/redis/api-key', payload);
}

  async deleteApiKey(apiKey: string): Promise<ServiceResult> {
    return this.makeRequest('DELETE', `/redis/api-key/${apiKey}`);
  }

  async getApiKey(apiKey: string): Promise<ServiceResult> {
    return this.makeRequest('GET', `/redis/api-key/${apiKey}`);
  }

async setUserCreditsViaKey(apiKey: string, credits: number): Promise<ServiceResult> {
  return this.makeRequest('PATCH', `/redis/credits/${apiKey}`, { credits: toInt(credits, 0) });
}

async setUserCredits(userId: string | number, credits: number): Promise<ServiceResult> {
  const keysRes = await this.getUserApiKeys(userId);
  if (!keysRes.success) return keysRes as ServiceResult;
  const list = (keysRes.data as any)?.api_keys;
  if (!Array.isArray(list) || list.length === 0) {
    return { success: false, statusCode: 404, message: 'No API keys found for user' };
  }
  const anyKey = list[0].api_key as string;
  return this.setUserCreditsViaKey(anyKey, credits);
}


  async updateApiKeyCredits(apiKey: string, credits: number): Promise<ServiceResult> {
    return this.makeRequest('PATCH', `/redis/credits/${apiKey}`, { credits: toInt(credits, 0) });
  }

  async getUserCredits(userId: string | number): Promise<ServiceResult> {
    return this.makeRequest('GET', `/redis/user-credits/${userId}`);
  }

  async getUserApiKeys(userId: string | number): Promise<ServiceResult> {
    return this.makeRequest('GET', `/redis/user-api-keys/${userId}`);
  }

  async getUserUsageLogs(userId: string | number, date: string): Promise<ServiceResult> {
    return this.makeRequest('GET', `/redis/usage-logs/${userId}/${date}`);
  }

  async clearUserUsageLogs(userId: string | number, date: string): Promise<ServiceResult> {
    return this.makeRequest('DELETE', `/redis/usage-logs/${userId}/${date}`);
  }

  async recordApiUsage(usageData: {
    api_key: string;
    endpoint: string;
    credits_used: number;
    response_time_ms?: number;
    status?: string;
    metadata?: any;
  }): Promise<ServiceResult> {
    return this.makeRequest('POST', '/redis/record-usage', {
      api_key: usageData.api_key,
      endpoint: usageData.endpoint,
      credits_used: toInt(usageData.credits_used, 0),
      response_time_ms: usageData.response_time_ms,
      status: usageData.status || 'success',
      metadata: usageData.metadata,
    });
  }

  async getApiKeyCredits(apiKey: string): Promise<ServiceResult> {
    return this.makeRequest('GET', `/redis/credits/${apiKey}`);
  }

  async checkSyncStatus(): Promise<ServiceResult> {
    return this.makeRequest('GET', '/redis/sync-status');
  }

  async getRedisDump(): Promise<ServiceResult> {
    return this.makeRequest('GET', '/redis/dump');
  }

  async flushRedisDb(): Promise<ServiceResult> {
    return this.makeRequest('POST', '/redis/flushdb');
  }
}

export const redisSyncService = new RedisSyncService();
