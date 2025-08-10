import { Pool } from 'pg';

// Check for database URL
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Create a singleton connection pool optimized for serverless
const createPool = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  const isVercel = process.env.VERCEL === '1';

  return new Pool({
    connectionString: process.env.DATABASE_URL,
    // Serverless-optimized: cap connections for Vercel
    max: isVercel ? 1 : 3,
    idleTimeoutMillis: isVercel ? 0 : 30000,
    connectionTimeoutMillis: 15000,
    // SSL configuration for production (sslmode=require should be in URL)
    ssl: isProduction ? { rejectUnauthorized: false } : false,
    // Disable keepAlive for serverless
    keepAlive: !isVercel,
  });
};

// Global connection pool instance (reused across serverless invocations)
declare global {
  var __api_db_pool: Pool | undefined;
}

export const pool = globalThis.__api_db_pool ?? createPool();

if (process.env.NODE_ENV !== 'production') {
  globalThis.__api_db_pool = pool;
}

// Error handling
pool.on('error', (err) => {
  console.error('Database pool error:', err);
});