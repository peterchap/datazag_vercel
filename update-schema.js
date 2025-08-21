// Direct database schema update
require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

async function updateSchema() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: false
  });

  const client = await pool.connect();
  
  try {
    console.log('Updating database schema...');
    
    // Add first_name and last_name columns
    await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name TEXT');
    await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name TEXT');
    await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS website TEXT');
    await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS credits INTEGER DEFAULT 0');
    await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true');
    await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false');
    
    // Add password column if it doesn't exist (but make it nullable for now)
    await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS password TEXT');
    
    // Add currency column to credit_bundles for multi-currency support
    await client.query("ALTER TABLE credit_bundles ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'usd'");
    
    console.log('Schema updated successfully!');
    
    // Show current schema
    const columns = await client.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      ORDER BY ordinal_position
    `);
    
    console.log('\nCurrent columns:');
    columns.rows.forEach(col => {
      console.log(`- ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  }
  
  client.release();
  pool.end();
}

updateSchema();
