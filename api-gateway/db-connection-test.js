/**
 * Simple Database Connection Test Script
 * 
 * This script tests only the database connection to help troubleshoot
 * connection issues between the API gateway and your PostgreSQL database.
 */

require('dotenv').config();
const { Pool } = require('pg');

async function testDatabaseConnection() {
  console.log('Database Connection Test');
  console.log('=======================');
  
  if (!process.env.DATABASE_URL) {
    console.error('Error: DATABASE_URL environment variable is not set');
    process.exit(1);
  }
  
  console.log('Testing connection with DATABASE_URL...');
  
  // Parse the database URL to show connection details without credentials
  try {
    const url = new URL(process.env.DATABASE_URL);
    console.log('Connection details:');
    console.log('- Host:', url.hostname);
    console.log('- Port:', url.port || '5432 (default)');
    console.log('- Database:', url.pathname.substring(1));
    console.log('- Username: [hidden]');
    console.log('- Password: [hidden]');
    console.log('- SSL Mode:', url.searchParams.get('sslmode') || 'not specified');
  } catch (err) {
    console.error('Error: Invalid DATABASE_URL format -', err.message);
    process.exit(1);
  }
  
  // Create connection pool with diagnostics options
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    // Try both with and without SSL settings
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000  // 10 second timeout
  });
  
  try {
    console.log('\nAttempting to connect...');
    const result = await pool.query('SELECT NOW() as current_time');
    console.log('SUCCESS! Connected to database.');
    console.log('Database server time:', result.rows[0].current_time);
    
    // List available tables in the database
    console.log('\nListing tables in database:');
    const tablesResult = await pool.query(`
      SELECT table_name, table_schema 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    if (tablesResult.rows.length === 0) {
      console.log('No tables found in the public schema.');
    } else {
      console.log('Available tables:');
      tablesResult.rows.forEach(row => {
        console.log(`- ${row.table_name}`);
      });
    }
    
  } catch (err) {
    console.error('\nFAILED TO CONNECT TO DATABASE');
    console.error('Error code:', err.code);
    console.error('Error message:', err.message);
    
    // Provide guidance based on error code
    switch(err.code) {
      case 'ENOTFOUND':
        console.error('\nTROUBLESHOOTING: Host not found');
        console.error('- Check that the hostname is correct');
        console.error('- Check network connectivity to the database server');
        break;
      case 'ECONNREFUSED': 
        console.error('\nTROUBLESHOOTING: Connection refused');
        console.error('- Verify the database is running and accepting connections');
        console.error('- Check if a firewall is blocking the connection');
        console.error('- Verify the port number is correct');
        break;
      case '28P01':
        console.error('\nTROUBLESHOOTING: Authentication failed');
        console.error('- Check username and password in DATABASE_URL');
        break;
      case '3D000':
        console.error('\nTROUBLESHOOTING: Database does not exist');
        console.error('- Verify the database name in DATABASE_URL');
        break;
      case '42501':
        console.error('\nTROUBLESHOOTING: Permission denied');
        console.error('- The user doesn\'t have permission to access the database');
        break;
      case 'DEPTH_ZERO_SELF_SIGNED_CERT':
      case 'SELF_SIGNED_CERT_IN_CHAIN':
        console.error('\nTROUBLESHOOTING: SSL certificate error');
        console.error('- Try setting DATABASE_URL with sslmode=no-verify');
        console.error('- For production, you should configure proper SSL certificates');
        break;
      default:
        console.error('\nTROUBLESHOOTING: Unknown error');
        console.error('- Check if DATABASE_URL is correctly formatted');
        console.error('- Verify all connection parameters');
    }
  } finally {
    // Close the connection pool
    await pool.end();
  }
}

// Run the test
testDatabaseConnection().catch(err => {
  console.error('Uncaught error:', err);
});