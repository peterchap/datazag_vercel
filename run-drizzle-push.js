const { execSync } = require('child_process');
require('dotenv').config({ path: '.env.local' });

console.log('Running Drizzle schema push...');
console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Set' : 'Not set');

try {
  // Set the environment variable and run drizzle push
  process.env.DATABASE_URL = process.env.DATABASE_URL;
  execSync('npx drizzle-kit push', { 
    stdio: 'inherit',
    env: process.env 
  });
  console.log('✅ Drizzle schema push completed!');
} catch (error) {
  console.error('❌ Drizzle push failed:', error.message);
}
