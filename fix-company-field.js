// Script to fix NULL company values in users table
// To run this script with TypeScript:
// npx tsx fix-company-field.js

// Direct SQL approach using the DATABASE_URL environment variable
import { Pool } from 'pg';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function fixCompanyField() {
  // Create a new pool with the DATABASE_URL
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });

  try {
    console.log('Connecting to database...');
    
    // Update all users with NULL company to have a default value
    const result = await pool.query(
      'UPDATE users SET company = $1 WHERE company IS NULL',
      ['Default Company']
    );
    
    console.log('Database update completed:');
    console.log(`Updated ${result.rowCount} users with default company value`);
    
    // Verify no NULL values remain
    const nullCheck = await pool.query(
      'SELECT COUNT(*) as count FROM users WHERE company IS NULL'
    );
    
    const nullCount = parseInt(nullCheck.rows[0].count);
    if (nullCount === 0) {
      console.log('Success: No NULL values remain in the company field');
    } else {
      console.log(`Warning: ${nullCount} users still have NULL company values`);
    }
    
  } catch (error) {
    console.error('Error updating company field:', error);
  } finally {
    // Close database connection
    console.log('Closing database connection...');
    await pool.end();
    process.exit(0);
  }
}

fixCompanyField();