// Simple test users API using direct SQL
import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import bcrypt from 'bcrypt';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

export async function POST() {
  const client = await pool.connect();
  
  try {
    console.log('Creating test users with SQL...');
    
    // First, add missing columns if they don't exist - comprehensive list
    const columnsToAdd = [
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name TEXT',
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name TEXT', 
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS username TEXT',
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS password TEXT',
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS company TEXT',
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS website TEXT',
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS company_address TEXT',
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS credits INTEGER DEFAULT 0',
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT',
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT \'user\'',
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS parent_user_id INTEGER',
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS can_purchase_credits BOOLEAN DEFAULT true',
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS grace_period_end TIMESTAMP',
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS credit_threshold INTEGER',
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true',
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false',
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verification_token TEXT',
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verification_expires TIMESTAMP',
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_token TEXT',
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_expires TIMESTAMP',
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP',
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0',
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS account_locked BOOLEAN DEFAULT false',
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS account_locked_until TIMESTAMP',
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT false',
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_secret TEXT',
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS recovery_codes TEXT',
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id TEXT',
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS github_id TEXT',
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS microsoft_id TEXT',
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS linkedin_id TEXT'
    ];
    
    // Add all columns
    for (const sql of columnsToAdd) {
      try {
        await client.query(sql);
      } catch (error: any) {
        // Ignore errors for columns that already exist
        if (!error.message?.includes('already exists')) {
          console.log(`Warning: ${error.message}`);
        }
      }
    }
    
    const hashedPassword = await bcrypt.hash('testpass123', 10);
    
    const testUsers = [
      {
        firstName: 'DataZag',
        lastName: 'Admin',
        email: 'admin@datazag.com',
        company: 'DataZag Inc',
        role: 'business_admin',
        canPurchaseCredits: true,
        credits: 1000
      },
      {
        firstName: 'John',
        lastName: 'Smith',
        email: 'admin@acme.com',
        company: 'Acme Corp',
        role: 'client_admin',
        canPurchaseCredits: true,
        credits: 500
      },
      {
        firstName: 'Mike',
        lastName: 'Wilson',
        email: 'user@acme.com',
        company: 'Acme Corp',
        role: 'user',
        canPurchaseCredits: false,
        credits: 50
      }
    ];
    
    const createdUsers = [];
    
    for (const user of testUsers) {
      const result = await client.query(`
        INSERT INTO users (first_name, last_name, email, company, role, can_purchase_credits, credits, password, active, email_verified)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (email) DO UPDATE SET
          first_name = EXCLUDED.first_name,
          last_name = EXCLUDED.last_name,
          role = EXCLUDED.role,
          company = EXCLUDED.company,
          can_purchase_credits = EXCLUDED.can_purchase_credits,
          credits = EXCLUDED.credits,
          password = EXCLUDED.password,
          active = EXCLUDED.active,
          email_verified = EXCLUDED.email_verified
        RETURNING id, first_name, last_name, email, role, company, can_purchase_credits, credits
      `, [
        user.firstName,
        user.lastName,
        user.email,
        user.company,
        user.role,
        user.canPurchaseCredits,
        user.credits,
        hashedPassword,
        true,
        true
      ]);
      
      createdUsers.push({
        id: result.rows[0].id,
        name: `${result.rows[0].first_name} ${result.rows[0].last_name}`,
        email: result.rows[0].email,
        role: result.rows[0].role,
        company: result.rows[0].company,
        canPurchaseCredits: result.rows[0].can_purchase_credits,
        credits: result.rows[0].credits
      });
    }
    
    return NextResponse.json({
      success: true,
      message: 'Test users created successfully using SQL',
      users: createdUsers,
      testCredentials: {
        password: 'testpass123',
        users: testUsers.map(u => ({
          email: u.email,
          role: u.role,
          company: u.company,
          description: u.role === 'business_admin' ? 'Platform admin - full access' :
                      u.role === 'client_admin' ? 'Company admin - manage users & credits' :
                      'Regular user - API consumption only'
        }))
      }
    });
    
  } catch (error: any) {
    console.error('Error:', error.message);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function GET() {
  const client = await pool.connect();
  
  try {
    const result = await client.query(`
      SELECT id, first_name, last_name, email, role, company, can_purchase_credits, credits, active
      FROM users 
      ORDER BY role, first_name
    `);
    
    const users = result.rows.map(row => ({
      id: row.id,
      name: `${row.first_name || ''} ${row.last_name || ''}`.trim() || row.email,
      email: row.email,
      role: row.role,
      company: row.company,
      canPurchaseCredits: row.can_purchase_credits,
      credits: row.credits || 0
    }));
    
    return NextResponse.json({
      success: true,
      users,
      summary: {
        total: users.length,
        businessAdmins: users.filter(u => u.role === 'business_admin').length,
        clientAdmins: users.filter(u => u.role === 'client_admin').length,
        regularUsers: users.filter(u => u.role === 'user').length
      }
    });
    
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  } finally {
    client.release();
  }
}
