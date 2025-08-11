import { Pool } from 'pg';

declare global {
  // eslint-disable-next-line no-var
  var __datazag_pool__: Pool | undefined;
}

// Reuse a singleton pool across hot reloads in dev
const pool =
  global.__datazag_pool__ ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

if (process.env.NODE_ENV !== 'production') {
  global.__datazag_pool__ = pool;
}

export { pool };