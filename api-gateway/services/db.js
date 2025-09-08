const { Pool } = require('pg');

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL environment variable is required.');
  process.exit(1);
}

// This function provides more robust logic for determining the SSL configuration.
const determineSslConfig = () => {
    // Explicitly disable SSL if the environment variable is set to 'false'
    if (process.env.DB_USE_SSL === 'false') {
        console.log("Database SSL explicitly disabled via DB_USE_SSL=false.");
        return false;
    }

    try {
        const dbUrl = new URL(process.env.DATABASE_URL);
        const host = dbUrl.hostname;
        // Disable SSL for standard local hostnames
        if (host === 'localhost' || host === '127.0.0.1') {
            console.log("Local database detected. Disabling SSL.");
            return false;
        }
    } catch (e) {
        console.error("Could not parse DATABASE_URL to determine SSL config.", e);
    }
    
    // Default to SSL for all other connections (typical for cloud databases)
    console.log("Non-local database detected. Enabling SSL.");
    return { rejectUnauthorized: false };
};

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: determineSslConfig(),
  connectionTimeoutMillis: 10000,
  max: 10,
  idleTimeoutMillis: 30000,
});

pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

// Test the database connection on startup
pool.query('SELECT NOW()', (err, result) => {
  if (err) {
    console.error('Database connection error:', err.message);
    process.exit(1);
  } else {
    console.log('Database connected successfully.');
  }
});

module.exports = { pool };