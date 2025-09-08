import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from '@/shared/schema';

const rawUrl = process.env.DATABASE_URL?.trim();
if (!rawUrl) throw new Error('DATABASE_URL must be set');
if (rawUrl.startsWith('duckdb://')) throw new Error('duckdb:// not supported in this deployment');

const isProduction = process.env.NODE_ENV === 'production';
const isVercel = process.env.VERCEL === '1';

const createPool = () => new Pool({
  connectionString: rawUrl,
  max: isVercel ? 1 : (isProduction ? 3 : 10),
  idleTimeoutMillis: isVercel ? 0 : 30000,
  connectionTimeoutMillis: 15000,
  ssl: isProduction ? { rejectUnauthorized: false } : false,
  keepAlive: !isVercel,
  keepAliveInitialDelayMillis: isVercel ? 0 : 10000,
});

declare global { // eslint-disable-line
  // eslint-disable-next-line no-var
  var __datazag_drizzle_pool__: Pool | undefined;
}

export const pool = globalThis.__datazag_drizzle_pool__ ?? createPool();
if (process.env.NODE_ENV !== 'production') {
  globalThis.__datazag_drizzle_pool__ = pool;
}

export const db = drizzle(pool, { schema });