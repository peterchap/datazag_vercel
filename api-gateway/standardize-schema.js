/**
 * Database Schema Standardization Script
 * 
 * This script standardizes column names across your database tables,
 * making them consistent between development and production environments.
 * 
 * - Changes 'is_active' columns to 'active' where needed
 * - Preserves existing data during migration
 */

require('dotenv').config();
const { Pool } = require('pg');

async function standardizeSchema() {
  console.log('🔄 Database Schema Standardization');
  console.log('=================================');
  
  if (!process.env.DATABASE_URL) {
    console.error('❌ Error: DATABASE_URL environment variable is not set');
    process.exit(1);
  }

  // Create a pool with the connection string
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DB_USE_SSL === 'false' ? false : { rejectUnauthorized: false }
  });

  try {
    console.log('📊 Connecting to database...');
    const connTest = await pool.query('SELECT NOW() as time');
    console.log(`✅ Connected to database at ${connTest.rows[0].time}`);
    
    // Begin transaction
    await pool.query('BEGIN');
    console.log('Transaction started');
    
    // 1. Standardize discount_codes table
    console.log('\n🔄 Standardizing discount_codes table...');
    try {
      // Check if the table exists
      const tableExists = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'discount_codes'
        );
      `);
      
      if (tableExists.rows[0].exists) {
        // Check if the is_active column exists
        const isActiveExists = await pool.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'discount_codes' 
            AND column_name = 'is_active'
          );
        `);
        
        // Check if the active column exists
        const activeExists = await pool.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'discount_codes' 
            AND column_name = 'active'
          );
        `);
        
        if (isActiveExists.rows[0].exists && !activeExists.rows[0].exists) {
          // Add the active column
          await pool.query(`ALTER TABLE discount_codes ADD COLUMN active BOOLEAN DEFAULT TRUE;`);
          console.log('Added active column to discount_codes');
          
          // Copy values from is_active to active
          await pool.query(`UPDATE discount_codes SET active = is_active;`);
          console.log('Copied values from is_active to active in discount_codes');
          
          // Drop the is_active column
          await pool.query(`ALTER TABLE discount_codes DROP COLUMN is_active;`);
          console.log('Dropped is_active column from discount_codes');
        } else if (isActiveExists.rows[0].exists && activeExists.rows[0].exists) {
          console.log('Both is_active and active columns exist in discount_codes.');
          
          // Make sure active has all the values from is_active
          await pool.query(`UPDATE discount_codes SET active = is_active WHERE active IS NULL;`);
          console.log('Synchronized values between is_active and active columns');
          
          // Drop the is_active column
          await pool.query(`ALTER TABLE discount_codes DROP COLUMN is_active;`);
          console.log('Dropped is_active column from discount_codes');
        } else if (!isActiveExists.rows[0].exists && !activeExists.rows[0].exists) {
          // Add the active column if neither exists
          await pool.query(`ALTER TABLE discount_codes ADD COLUMN active BOOLEAN DEFAULT TRUE;`);
          console.log('Added active column to discount_codes (neither column existed)');
        } else {
          console.log('Only active column exists in discount_codes. No changes needed.');
        }
      } else {
        console.log('discount_codes table does not exist. Skipping.');
      }
    } catch (error) {
      console.error(`❌ Error standardizing discount_codes: ${error.message}`);
    }
    
    // 2. Standardize subscription_plans table
    console.log('\n🔄 Standardizing subscription_plans table...');
    try {
      // Check if the table exists
      const tableExists = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'subscription_plans'
        );
      `);
      
      if (tableExists.rows[0].exists) {
        // Check if the is_active column exists
        const isActiveExists = await pool.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'subscription_plans' 
            AND column_name = 'is_active'
          );
        `);
        
        // Check if the active column exists
        const activeExists = await pool.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'subscription_plans' 
            AND column_name = 'active'
          );
        `);
        
        if (isActiveExists.rows[0].exists && !activeExists.rows[0].exists) {
          // Add the active column
          await pool.query(`ALTER TABLE subscription_plans ADD COLUMN active BOOLEAN DEFAULT TRUE;`);
          console.log('Added active column to subscription_plans');
          
          // Copy values from is_active to active
          await pool.query(`UPDATE subscription_plans SET active = is_active;`);
          console.log('Copied values from is_active to active in subscription_plans');
          
          // Drop the is_active column
          await pool.query(`ALTER TABLE subscription_plans DROP COLUMN is_active;`);
          console.log('Dropped is_active column from subscription_plans');
        } else if (isActiveExists.rows[0].exists && activeExists.rows[0].exists) {
          console.log('Both is_active and active columns exist in subscription_plans.');
          
          // Make sure active has all the values from is_active
          await pool.query(`UPDATE subscription_plans SET active = is_active WHERE active IS NULL;`);
          console.log('Synchronized values between is_active and active columns');
          
          // Drop the is_active column
          await pool.query(`ALTER TABLE subscription_plans DROP COLUMN is_active;`);
          console.log('Dropped is_active column from subscription_plans');
        } else if (!isActiveExists.rows[0].exists && !activeExists.rows[0].exists) {
          // Add the active column if neither exists
          await pool.query(`ALTER TABLE subscription_plans ADD COLUMN active BOOLEAN DEFAULT TRUE;`);
          console.log('Added active column to subscription_plans (neither column existed)');
        } else {
          console.log('Only active column exists in subscription_plans. No changes needed.');
        }
      } else {
        console.log('subscription_plans table does not exist. Skipping.');
      }
    } catch (error) {
      console.error(`❌ Error standardizing subscription_plans: ${error.message}`);
    }
    
    // 3. Check credit_bundles table
    console.log('\n🔄 Checking credit_bundles table...');
    try {
      // Check if the table exists
      const tableExists = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'credit_bundles'
        );
      `);
      
      if (tableExists.rows[0].exists) {
        // Check if the active column exists
        const activeExists = await pool.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'credit_bundles' 
            AND column_name = 'active'
          );
        `);
        
        if (!activeExists.rows[0].exists) {
          // Add the active column
          await pool.query(`ALTER TABLE credit_bundles ADD COLUMN active BOOLEAN DEFAULT TRUE;`);
          console.log('Added active column to credit_bundles');
        } else {
          console.log('active column already exists in credit_bundles. No changes needed.');
        }
      } else {
        console.log('credit_bundles table does not exist. Skipping.');
      }
    } catch (error) {
      console.error(`❌ Error checking credit_bundles: ${error.message}`);
    }
    
    // 4. Check api_keys table
    console.log('\n🔄 Checking api_keys table...');
    try {
      // Check if the table exists
      const tableExists = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'api_keys'
        );
      `);
      
      if (tableExists.rows[0].exists) {
        // Check if the active column exists
        const activeExists = await pool.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'api_keys' 
            AND column_name = 'active'
          );
        `);
        
        if (!activeExists.rows[0].exists) {
          // Add the active column
          await pool.query(`ALTER TABLE api_keys ADD COLUMN active BOOLEAN DEFAULT TRUE;`);
          console.log('Added active column to api_keys');
        } else {
          console.log('active column already exists in api_keys. No changes needed.');
        }
      } else {
        console.log('api_keys table does not exist. Skipping.');
      }
    } catch (error) {
      console.error(`❌ Error checking api_keys: ${error.message}`);
    }
    
    // Commit transaction
    await pool.query('COMMIT');
    console.log('\n✅ Transaction committed successfully');
    
    console.log('\n🏁 Schema standardization complete!');
  } catch (error) {
    // Rollback transaction on error
    await pool.query('ROLLBACK');
    console.error('❌ Error:', error.message);
    console.log('Transaction rolled back');
  } finally {
    await pool.end();
  }
}

// Run the script
standardizeSchema().catch(err => {
  console.error('Uncaught error:', err);
  process.exit(1);
});