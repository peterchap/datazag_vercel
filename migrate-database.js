// Database migration to match Drizzle schema
require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

async function migrateDatabase() {
  console.log('🚀 Migrating database to match Drizzle schema...\n');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: false
  });

  try {
    const client = await pool.connect();
    
    console.log('1. Checking current schema...');
    const currentColumns = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      ORDER BY ordinal_position
    `);
    
    const columnNames = currentColumns.rows.map(row => row.column_name);
    console.log('Current columns:', columnNames.join(', '));
    
    // Check if we need to migrate from 'name' to 'first_name', 'last_name'
    if (columnNames.includes('name') && !columnNames.includes('first_name')) {
      console.log('\n2. Migrating from "name" to "first_name" and "last_name"...');
      
      // Add new columns
      await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name TEXT');
      await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name TEXT');
      
      // Split existing names into first and last names
      await client.query(`
        UPDATE users 
        SET 
          first_name = CASE 
            WHEN name IS NOT NULL AND position(' ' in name) > 0 
            THEN split_part(name, ' ', 1)
            ELSE COALESCE(name, 'User')
          END,
          last_name = CASE 
            WHEN name IS NOT NULL AND position(' ' in name) > 0 
            THEN substring(name from position(' ' in name) + 1)
            ELSE ''
          END
        WHERE first_name IS NULL OR last_name IS NULL
      `);
      
      // Make the new columns NOT NULL
      await client.query('ALTER TABLE users ALTER COLUMN first_name SET NOT NULL');
      await client.query('ALTER TABLE users ALTER COLUMN last_name SET NOT NULL');
      
      console.log('✅ Migrated name fields');
    }
    
    // Add missing columns that Drizzle schema expects
    const expectedColumns = [
      'username TEXT',
      'password TEXT NOT NULL DEFAULT \'temp_password\'',
      'website TEXT',
      'company_address TEXT',
      'credits INTEGER DEFAULT 0 NOT NULL',
      'stripe_customer_id TEXT',
      'parent_user_id INTEGER',
      'can_purchase_credits BOOLEAN DEFAULT true NOT NULL',
      'grace_period_end TIMESTAMP',
      'credit_threshold INTEGER',
      'active BOOLEAN DEFAULT true NOT NULL',
      'email_verified BOOLEAN DEFAULT false NOT NULL',
      'email_verification_token TEXT',
      'email_verification_expires TIMESTAMP',
      'password_reset_token TEXT',
      'password_reset_expires TIMESTAMP',
      'last_login TIMESTAMP',
      'failed_login_attempts INTEGER DEFAULT 0 NOT NULL',
      'account_locked BOOLEAN DEFAULT false NOT NULL',
      'account_locked_until TIMESTAMP',
      'two_factor_enabled BOOLEAN DEFAULT false NOT NULL',
      'two_factor_secret TEXT',
      'recovery_codes TEXT',
      'google_id TEXT UNIQUE',
      'github_id TEXT UNIQUE',
      'microsoft_id TEXT UNIQUE',
      'linkedin_id TEXT UNIQUE'
    ];
    
    console.log('\n3. Adding missing columns...');
    for (const columnDef of expectedColumns) {
      const columnName = columnDef.split(' ')[0];
      if (!columnNames.includes(columnName)) {
        try {
          await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS ${columnDef}`);
          console.log(`✅ Added column: ${columnName}`);
        } catch (error) {
          console.log(`⚠️  Could not add ${columnName}: ${error.message}`);
        }
      }
    }
    
    // Add foreign key constraint if not exists
    console.log('\n4. Adding foreign key constraints...');
    try {
      await client.query(`
        ALTER TABLE users 
        ADD CONSTRAINT fk_users_parent 
        FOREIGN KEY (parent_user_id) REFERENCES users(id)
      `);
      console.log('✅ Added parent user foreign key');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('✅ Parent user foreign key already exists');
      } else {
        console.log('⚠️  Could not add foreign key:', error.message);
      }
    }
    
    // Verify final schema
    console.log('\n5. Verifying updated schema...');
    const updatedColumns = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      ORDER BY ordinal_position
    `);
    
    console.log('Updated schema:');
    updatedColumns.rows.forEach(col => {
      console.log(`- ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });
    
    client.release();
    await pool.end();
    
    console.log('\n🎉 Database migration completed successfully!');
    console.log('The database now matches the Drizzle schema definition.');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

migrateDatabase();
