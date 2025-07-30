// Simple test user creation
require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

async function quickTestUsers() {
  console.log('Creating test users...');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: false
  });

  const client = await pool.connect();
  
  // Create companies
  await client.query("INSERT INTO companies (name, domain) VALUES ('DataZag Inc', 'datazag.com') ON CONFLICT DO NOTHING");
  await client.query("INSERT INTO companies (name, domain) VALUES ('Acme Corp', 'acme.com') ON CONFLICT DO NOTHING");
  
  // Get company IDs
  const datazag = await client.query("SELECT id FROM companies WHERE name = 'DataZag Inc'");
  const acme = await client.query("SELECT id FROM companies WHERE name = 'Acme Corp'");
  
  // Create users
  await client.query(`
    INSERT INTO users (email, name, role, company_id, can_purchase_credits) 
    VALUES ($1, $2, $3, $4, $5) ON CONFLICT (email) DO UPDATE SET role = EXCLUDED.role
  `, ['admin@datazag.com', 'DataZag Admin', 'BUSINESS_ADMIN', datazag.rows[0].id, true]);
  
  await client.query(`
    INSERT INTO users (email, name, role, company_id, can_purchase_credits) 
    VALUES ($1, $2, $3, $4, $5) ON CONFLICT (email) DO UPDATE SET role = EXCLUDED.role
  `, ['admin@acme.com', 'John Smith', 'CLIENT_ADMIN', acme.rows[0].id, true]);
  
  await client.query(`
    INSERT INTO users (email, name, role, company_id, can_purchase_credits) 
    VALUES ($1, $2, $3, $4, $5) ON CONFLICT (email) DO UPDATE SET role = EXCLUDED.role
  `, ['user@acme.com', 'Mike Wilson', 'USER', acme.rows[0].id, false]);
  
  // Verify
  const users = await client.query('SELECT email, name, role, can_purchase_credits FROM users ORDER BY role');
  console.log('Test users created:');
  users.rows.forEach(u => console.log(`${u.email} - ${u.role} - Credits: ${u.can_purchase_credits}`));
  
  client.release();
  pool.end();
}

quickTestUsers().catch(console.error);
