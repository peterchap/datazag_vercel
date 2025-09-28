import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
// import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '@/shared/schema';
import { existsSync, readFileSync } from 'fs';
import { resolve as resolvePath } from 'path';

console.log('=== NEXT.JS APP DATABASE CONNECTION ===');

const env = process.env.NODE_ENV || 'development';
const isProduction = env === 'production';
const isVercel = process.env.VERCEL === '1';

const mask = (s?: string) => (s && s.length > 8) ? s.replace(/^(.{4}).*(.{4})$/, '$1…$2') : s;

function readEnvVarFromFiles(name: string, files: string[]): string | undefined {
  for (const f of files) {
    try {
      const p = resolvePath(process.cwd(), f);
      if (!existsSync(p)) continue;
      const content = readFileSync(p, 'utf8');
      const lines = content.split(/\r?\n/);
      for (const line of lines) {
        const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
        if (m && m[1] === name) {
          let v = m[2];
          v = v.replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1'); // strip quotes
          return v;
        }
      }
    } catch {
      // ignore parse errors per-file
    }
  }
  return undefined;
}

// Prefer .env files locally (override OS env), always use process.env on Vercel
let rawUrlFromFiles: string | undefined;
if (!isVercel) {
  rawUrlFromFiles = readEnvVarFromFiles('DATABASE_URL', [
    `.env.${env}.local`,
    `.env.local`,
    `.env.${env}`,
    `.env`,
  ])?.trim();
}
const rawUrl = (rawUrlFromFiles || process.env.DATABASE_URL)?.trim();

const hint = isVercel ? 'Vercel project env' : `.env.${env}.local / .env.local / .env.${env} / .env (fallback to OS env)`;
console.log('DATABASE_URL set:', Boolean(rawUrl), 'hint:', hint, 'NODE_ENV:', env, 'source:', rawUrlFromFiles ? 'file' : 'env');
if (rawUrl) console.log('DATABASE_URL (masked):', mask(rawUrl));

if (!rawUrl) throw new Error('DATABASE_URL must be set');
if (rawUrl.startsWith('duckdb://')) throw new Error('duckdb:// not supported in this deployment');

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
if (!isProduction) {
  globalThis.__datazag_drizzle_pool__ = pool;
}

export const db = drizzle(pool, { schema });