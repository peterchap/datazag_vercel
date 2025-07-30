// Check actual database schema
require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

async function checkSchema() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: false
  });

  const client = await pool.connect();
  
  try {
    // Check users table structure
    const columns = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      ORDER BY ordinal_position
    `);
    
    console.log('Current users table structure:');
    columns.rows.forEach(col => {
      console.log(`- ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });
    
    // Check what users exist
    const userCount = await client.query('SELECT COUNT(*) FROM users');
    console.log(`\nCurrent users in database: ${userCount.rows[0].count}`);
    
    if (parseInt(userCount.rows[0].count) > 0) {
      const sampleUsers = await client.query('SELECT * FROM users LIMIT 3');
      console.log('\nSample users:');
      sampleUsers.rows.forEach(user => {
        console.log(`- ID: ${user.id}, Email: ${user.email}, Name: ${user.name || 'N/A'}`);
      });
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
  
  client.release();
  pool.end();
}

checkSchema();
