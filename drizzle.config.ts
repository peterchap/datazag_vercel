import { defineConfig } from 'drizzle-kit';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.production' });



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
