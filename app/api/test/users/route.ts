// Simple test endpoint to verify database connectivity and test users
import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

export async function GET() {
  const client = await pool.connect();
  
  try {
    // Get test users
    const result = await client.query(`
      SELECT id, email, name, role, credits, active, created_at
      FROM users 
      WHERE email IN ('john@doe.com', 'jane@test.com', 'api@tester.com')
      ORDER BY credits DESC
    `);

    return NextResponse.json({
      success: true,
      message: 'Test users retrieved successfully',
      users: result.rows,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Database error:', error);
    return NextResponse.json({
      success: false,
      error: 'Database connection failed',
      details: error.message
    }, { status: 500 });
  } finally {
    client.release();
  }
}
