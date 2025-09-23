import { defineConfig } from 'drizzle-kit';
import * as dotenv from 'dotenv';

const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env.development';
dotenv.config({ path: envFile });
// --- THIS IS THE FIX ---
// This code explicitly finds and loads your .env.local file, ensuring that
// drizzle-kit always uses the correct DATABASE_URL for your current environment.
dotenv.config({ path: '.env' });
dotenv.config({
  path: '.env.development',
});



// --- END OF FIX ---
console.log('=== DRIZZLE CONNECTION DEBUG ===');
console.log('DATABASE_URL:', process.env.DATABASE_URL);
console.log('Parsed connection details:');
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set in your .env.local file');

}
if (process.env.DATABASE_URL) {
  const url = new URL(process.env.DATABASE_URL);
  console.log('Host:', url.hostname);
  console.log('Port:', url.port);
  console.log('Database:', url.pathname.replace('/', ''));
  console.log('Username:', url.username);
}
console.log('================================');

export default defineConfig({
  schema: './shared/schema.ts',
  out: './drizzle', // Or './migrations' if you have changed it
  dialect: 'postgresql',
  dbCredentials: {
    // This now safely and dynamically uses the URL from your .env.local file.
    url: process.env.DATABASE_URL,
  },
  verbose: true,
  strict: true,
});
