const { Pool } = require('pg');
const bcrypt = require('bcrypt');

// Connect to the database using the DATABASE_URL environment variable
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function resetClientAdminPassword() {
  // New password you want to set
  const newPassword = 'client123';
  
  // Hash the password with bcrypt
  const hashedPassword = await bcrypt.hash(newPassword, 10);
  
  try {
    // Update the client_admin user's password
    const result = await pool.query(
      'UPDATE users SET password = $1 WHERE username = $2 RETURNING *',
      [hashedPassword, 'client_admin']
    );
    
    if (result.rows.length > 0) {
      console.log(`✅ Successfully reset password for user '${result.rows[0].username}'`);
      console.log(`👤 Username: client_admin`);
      console.log(`🔑 New Password: ${newPassword}`);
      console.log(`🔑 Hashed Password: ${hashedPassword}`);
    } else {
      console.error('❌ Client admin user not found');
    }
  } catch (error) {
    console.error('Error resetting password:', error);
  } finally {
    // Close the database connection
    pool.end();
  }
}

resetClientAdminPassword().catch(console.error);