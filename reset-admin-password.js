// Password reset script for admin user
import { Pool, neonConfig } from '@neondatabase/serverless';
import bcrypt from 'bcrypt';
import 'dotenv/config';
import ws from 'ws';

// Configure WebSocket for Neon
neonConfig.webSocketConstructor = ws;

// Function to hash password using bcrypt
async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

async function resetAdminPassword() {
  console.log('Starting admin password reset script...');
  
  if (!process.env.DATABASE_URL) {
    console.error('ERROR: DATABASE_URL environment variable is not set');
    process.exit(1);
  }
  
  // Create database connection
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    // New password for admin
    const newPassword = 'Admin123!';
    console.log(`Setting admin password to: ${newPassword}`);
    
    // Hash the password
    const hashedPassword = await hashPassword(newPassword);
    console.log('Password hashed successfully');
    
    // Update the admin user password in the database
    const result = await pool.query(
      'UPDATE users SET password = $1 WHERE username = $2 RETURNING id, username, role',
      [hashedPassword, 'admin']
    );
    
    if (result.rows.length === 0) {
      console.error('ERROR: Admin user not found');
      process.exit(1);
    }
    
    console.log('Password reset successful for user:', result.rows[0]);
    console.log('You can now log in with:');
    console.log('Username: admin');
    console.log(`Password: ${newPassword}`);
  } catch (error) {
    console.error('ERROR during password reset:', error);
    process.exit(1);
  } finally {
    // Close database connection
    await pool.end();
    console.log('Database connection closed');
  }
}

// Run the reset function
resetAdminPassword();