import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

// Check for database URL
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Optimized connection pool for Vercel serverless
const createPool = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  const isVercel = process.env.VERCEL === '1';

  return new Pool({
    connectionString: process.env.DATABASE_URL,
    // Serverless-optimized connection settings
    max: isVercel ? 1 : (isProduction ? 3 : 10), // Single connection for serverless
    idleTimeoutMillis: isVercel ? 0 : 30000, // Immediate cleanup for serverless
    connectionTimeoutMillis: 15000, // Allow time for cold starts
    // SSL configuration for production
    ssl: isProduction ? { rejectUnauthorized: false } : false,
    // Disable keepAlive for serverless to prevent hanging connections
    keepAlive: !isVercel,
    keepAliveInitialDelayMillis: isVercel ? 0 : 10000,
  });
};

// Create global connection pool (reused across serverless invocations)
declare global {
  var __db_pool: Pool | undefined;
}

export const pool = globalThis.__db_pool ?? createPool();

if (process.env.NODE_ENV !== 'production') {
  globalThis.__db_pool = pool;
}

// Enhanced error handling and connection validation
pool.on('error', (err) => {
  console.error('Unexpected database pool error:', err);
});

pool.on('connect', () => {
  if (process.env.NODE_ENV !== 'production') {
    console.log('Database connection established');
  }
});

// Create optimized Drizzle ORM instance with logger for development
export const db = drizzle(pool, { 
  schema,
  logger: process.env.NODE_ENV === 'development' ? {
    logQuery: (query, params) => {
      console.log('🔍 Query:', query);
      if (params.length > 0) console.log('📊 Params:', params);
    }
  } : false
});

// Graceful shutdown handler for non-serverless environments
if (process.env.VERCEL !== '1') {
  process.on('SIGINT', async () => {
    console.log('Closing database pool...');
    await pool.end();
    process.exit(0);
  });
}