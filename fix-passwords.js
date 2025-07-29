// Script to reset test account passwords with proper bcrypt hashing
import bcrypt from 'bcrypt';
import { Pool, neonConfig } from '@neondatabase/serverless';
import dotenv from 'dotenv';
import ws from 'ws';

// Configure WebSocket for Neon
neonConfig.webSocketConstructor = ws;

dotenv.config();

// We know the passwords for these test accounts so we'll reset them
const TEST_ACCOUNTS = [
  { username: 'test1', password: 'password123' },
  { username: 'admin', password: 'admin123' },
  { username: 'client_admin', password: 'admin123' }
];

async function fixPasswords() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  console.log('Starting password fix...');
  
  for (const account of TEST_ACCOUNTS) {
    try {
      // Hash the password with bcrypt
      const hashedPassword = await bcrypt.hash(account.password, 10);
      
      // Update the user's password in the database
      const result = await pool.query(
        'UPDATE users SET password = $1 WHERE username = $2 RETURNING id',
        [hashedPassword, account.username]
      );
      
      if (result.rowCount > 0) {
        console.log(`✅ Fixed password for ${account.username} (ID: ${result.rows[0].id})`);
      } else {
        console.log(`❌ User not found: ${account.username}`);
      }
    } catch (error) {
      console.error(`Error updating ${account.username}:`, error);
    }
  }
  
  console.log('Password fix completed');
  
  await pool.end();
}

fixPasswords().catch(err => {
  console.error('Failed to fix passwords:', err);
  process.exit(1);
});