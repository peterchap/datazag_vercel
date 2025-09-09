/// <reference types="node" />
import { defineConfig } from "drizzle-kit";
import * as dotenv from 'dotenv';

dotenv.config({
  path: '.env.local',
});

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set. Ensure the database is provisioned.");
}
//console.log(`[drizzle-kit] Attempting to connect with DATABASE_URL: ${process.env.DATABASE_URL}`);

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: "postgresql://neondb_owner:npg_YvoBpI3PHL1u@ep-lively-math-adg9ggki-pooler.c-2.us-east-1.aws.neon.tech:5432/neondb?sslmode=require&channel_binding=require",
  },
  // Performance optimizations
  verbose: true,
  strict: true,
  // Enable introspection for better type safety
  introspect: {
    casing: 'camel',
  },
});
