/**
 * Database Connection / Drizzle ORM Initialization
 * -------------------------------------------------
 * Architecture Decision Record (ADR): Direct Postgres connections
 *
 * Context:
 * - This Next.js app is the ONLY consumer of the Postgres database.
 * - Production runs on Vercel with a Neon Postgres backend (serverless storage layer).
 * - We therefore do not expose an internal REST/GraphQL layer for other services; route handlers
 *   and server actions interact with the database directly via Drizzle.
 *
 * Pooling Strategy (Neon + Vercel):
 * - Serverless platforms can spawn many short‑lived lambdas; opening many native PG connections
 *   can exhaust the Neon connection limit quickly.
 * - We cap max connections aggressively when on Vercel (max = 1) to avoid stampeding.
 * - For local dev we allow a higher pool size for concurrency / tooling (max = 10; reduced to 3
 *   in production non-Vercel environments for safety).
 * - idleTimeoutMillis is set to 0 on Vercel to immediately release the single connection when
 *   the lambda instance is frozen; elsewhere we keep a 30s idle timeout for reuse.
 *
 * When to Revisit:
 * - If we introduce background workers / queues: create a separate pool instance (DO NOT reuse
 *   the global) with an adjusted max, or consider PgBouncer / Neon pooled connection string.
 * - If we move critical logic to Edge Runtime: native 'pg' is not supported—switch to Drizzle's
 *   HTTP driver (e.g. Neon serverless driver) for those specific edge handlers.
 * - If additional apps/microservices need DB access: introduce an internal API or shared RPC
 *   contract; until then, direct queries keep latency and complexity low.
 *
 * Safety & Conventions:
 * - Never import this module from a Client Component. It must only execute on the server.
 * - All schema changes flow through Drizzle migrations (see /drizzle or scripts) to ensure
 *   runtime schema and types stay aligned.
 * - Keep this file minimal; do not embed app business logic here.
 *
 * Adjustments:
 * - To tweak limits, edit max / idleTimeoutMillis below; ensure any change considers Neon plan
 *   connection caps.
 */
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from '@shared/schema';

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
