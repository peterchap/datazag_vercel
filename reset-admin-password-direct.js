// Simpler password reset script for admin user
// This uses pg directly instead of NeonDB serverless
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
require('dotenv').config();

// Function to hash password with bcrypt
async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

async function resetAdminPassword() {
  console.log('Starting admin password reset script...');
  
  if (!process.env.PGHOST || !process.env.PGUSER || !process.env.PGPASSWORD || !process.env.PGDATABASE) {
    console.error('ERROR: PostgreSQL connection variables are not set');
    console.error('Required: PGHOST, PGUSER, PGPASSWORD, PGDATABASE');
    process.exit(1);
  }
  
  // Create a connection pool
  const pool = new Pool({
    host: process.env.PGHOST,
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    database: process.env.PGDATABASE,
    port: process.env.PGPORT || 5432,
    ssl: false
  });
  
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