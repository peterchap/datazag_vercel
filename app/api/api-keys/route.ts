// API endpoint for creating and managing API keys (admin-only)
import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import crypto from 'crypto';
import { validateAdminAuth } from '@/lib/adminAuth';
import { handleCorsPreflightRequest, validateCorsForActualRequest, handleCorsHeaders } from '@/lib/cors';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Generate a secure API key
function generateAPIKey() {
  return 'datazag_' + crypto.randomBytes(32).toString('hex');
}

// Handle CORS preflight requests
export async function OPTIONS(request: NextRequest) {
  const corsResponse = handleCorsPreflightRequest(request);
  if (corsResponse) return corsResponse;

  // This shouldn't happen, but fallback
  return new NextResponse(null, { status: 204 });
}

// Create API key (admin-only)
export async function POST(request: NextRequest) {
  // Handle CORS for actual request
  const corsError = validateCorsForActualRequest(request);
  if (corsError) return corsError;

  // Validate admin authentication
  const authError = validateAdminAuth(request);
  if (authError) return authError;

  const client = await pool.connect();
  
  try {
    const body = await request.json();
    const { userId, name } = body;

    if (!userId) {
      const response = NextResponse.json({
        success: false,
        error: 'userId is required'
      }, { status: 400 });
      return handleCorsHeaders(request, response);
    }

    if (!name) {
      const response = NextResponse.json({
        success: false,
        error: 'name is required'
      }, { status: 400 });
      return handleCorsHeaders(request, response);
    }

    // Generate API key
    const apiKey = generateAPIKey();
    
    // Get user details
    const userResult = await client.query(
      'SELECT id, email, credits FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      const response = NextResponse.json({
        success: false,
        error: 'User not found'
      }, { status: 404 });
      return handleCorsHeaders(request, response);
    }

    const user = userResult.rows[0];

    // Begin transaction
    await client.query('BEGIN');

    // Create API key in database
    const keyResult = await client.query(`
      INSERT INTO api_keys (
        user_id, api_key, key_name, 
        is_active, created_at, updated_at
      ) VALUES ($1, $2, $3, true, NOW(), NOW())
      RETURNING id, api_key, key_name, is_active, created_at
    `, [userId, apiKey, name]);

    const newKey = keyResult.rows[0];

    await client.query('COMMIT');

    const response = NextResponse.json({
      success: true,
      message: 'API key created successfully',
      key: {
        id: newKey.id,
        key: newKey.api_key,
        name: newKey.key_name,
        active: newKey.is_active,
        created_at: newKey.created_at
      },
      user: {
        id: user.id,
        email: user.email,
        credits: user.credits
      }
    }, { status: 201 });

    return handleCorsHeaders(request, response);

  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('API key creation error:', error);
    
    const response = NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error.message
    }, { status: 500 });

    return handleCorsHeaders(request, response);
  } finally {
    client.release();
  }
}

// Get API keys (admin-only)
export async function GET(request: NextRequest) {
  // Handle CORS for actual request
  const corsError = validateCorsForActualRequest(request);
  if (corsError) return corsError;

  // Validate admin authentication
  const authError = validateAdminAuth(request);
  if (authError) return authError;

  const client = await pool.connect();
  
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    let query = `
      SELECT 
        ak.id, ak.api_key, ak.key_name, 
        ak.is_active, ak.created_at,
        u.email, u.credits
      FROM api_keys ak
      JOIN users u ON ak.user_id = u.id
    `;
    
    let params: any[] = [];
    
    if (userId) {
      query += ' WHERE ak.user_id = $1';
      params.push(userId);
    }
    
    query += ' ORDER BY ak.created_at DESC';

    const result = await client.query(query, params);

    const response = NextResponse.json({
      success: true,
      keys: result.rows.map(row => ({
        id: row.id,
        key: row.api_key,
        name: row.key_name,
        active: row.is_active,
        created_at: row.created_at,
        user_email: row.email,
        user_credits: row.credits
      }))
    });

    return handleCorsHeaders(request, response);

  } catch (error: any) {
    console.error('API keys retrieval error:', error);
    const response = NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });

    return handleCorsHeaders(request, response);
  } finally {
    client.release();
  }
}