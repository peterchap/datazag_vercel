// Check database schema for api_keys table
require('dotenv').config();
const { Pool } = require('pg');

async function checkSchema() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: false
  });
  
  const client = await pool.connect();
  
  try {
    console.log('🔍 Checking api_keys table schema...\n');
    
    // Check if table exists
    const tableExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'api_keys'
      );
    `);
    
    if (tableExists.rows[0].exists) {
      console.log('✅ api_keys table exists');
      
      // Get column info
      const columns = await client.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = 'api_keys'
        ORDER BY ordinal_position;
      `);
      
      console.log('\n📋 Table structure:');
      columns.rows.forEach(col => {
        console.log(`   ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? '(NOT NULL)' : '(NULLABLE)'}`);
      });
      
    } else {
      console.log('❌ api_keys table does not exist');
      console.log('\n🔧 Creating api_keys table...');
      
      await client.query(`
        CREATE TABLE api_keys (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id),
          key_value VARCHAR(255) NOT NULL UNIQUE,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW(),
          last_used_at TIMESTAMP
        );
      `);
      
      console.log('✅ api_keys table created successfully');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

checkSchema();
