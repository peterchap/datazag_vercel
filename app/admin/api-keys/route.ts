// Admin-only API key management (moved under /admin), retains X-Admin-Secret + strict CORS
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { pool } from '@/lib/db';
import { validateAdminAuth } from '@/lib/adminAuth';
import {
  handleCorsPreflightRequest,
  validateCorsForActualRequest,
  handleCorsHeaders,
} from '@/lib/cors';

function generateAPIKey() {
  return 'datazag_' + crypto.randomBytes(32).toString('hex');
}

// Handle CORS preflight requests
export async function OPTIONS(request: NextRequest) {
  const corsResponse = handleCorsPreflightRequest(request);
  if (corsResponse) return corsResponse;
  return new NextResponse(null, { status: 204 });
}

// Create API key (admin-only)
export async function POST(request: NextRequest) {
  const corsError = validateCorsForActualRequest(request);
  if (corsError) return corsError;

  const authError = validateAdminAuth(request);
  if (authError) return authError;

  const client = await pool.connect();
  try {
    const body = await request.json();
    const { userId, name } = body;

    if (!userId) {
      const response = NextResponse.json(
        { success: false, error: 'userId is required' },
        { status: 400 }
      );
      return handleCorsHeaders(request, response);
    }

    if (!name) {
      const response = NextResponse.json(
        { success: false, error: 'name is required' },
        { status: 400 }
      );
      return handleCorsHeaders(request, response);
    }

    const apiKey = generateAPIKey();

    // Optional: validate user exists
    const userResult = await client.query(
      'SELECT id, email, credits FROM users WHERE id = $1',
      [userId]
    );
    if (userResult.rows.length === 0) {
      const response = NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
      return handleCorsHeaders(request, response);
    }

    await client.query('BEGIN');
    const keyResult = await client.query(
      `
      INSERT INTO api_keys (
        user_id, api_key, key_name, is_active, created_at, updated_at
      ) VALUES ($1, $2, $3, true, NOW(), NOW())
      RETURNING id, api_key, key_name, is_active, created_at
      `,
      [userId, apiKey, name]
    );
    await client.query('COMMIT');

    const newKey = keyResult.rows[0];

    const response = NextResponse.json(
      {
        success: true,
        message: 'API key created successfully',
        key: {
          id: newKey.id,
          key: newKey.api_key,
          name: newKey.key_name,
          active: newKey.is_active,
          created_at: newKey.created_at,
        },
        user: userResult.rows[0],
      },
      { status: 201 }
    );

    return handleCorsHeaders(request, response);
  } catch (error: any) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Admin API key creation error:', error);
    const response = NextResponse.json(
      { success: false, error: 'Internal server error', details: error.message },
      { status: 500 }
    );
    return handleCorsHeaders(request, response);
  } finally {
    client.release();
  }
}

// Get API keys (admin-only)
export async function GET(request: NextRequest) {
  const corsError = validateCorsForActualRequest(request);
  if (corsError) return corsError;

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
    const params: any[] = [];
    if (userId) {
      query += ' WHERE ak.user_id = $1';
      params.push(userId);
    }
    query += ' ORDER BY ak.created_at DESC';

    const result = await client.query(query, params);

    const response = NextResponse.json({
      success: true,
      keys: result.rows.map((row) => ({
        id: row.id,
        key: row.api_key,
        name: row.key_name,
        active: row.is_active,
        created_at: row.created_at,
        user_email: row.email,
        user_credits: row.credits,
      })),
    });

    return handleCorsHeaders(request, response);
  } catch (error: any) {
    console.error('Admin API keys retrieval error:', error);
    const response = NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
    return handleCorsHeaders(request, response);
  } finally {
    client.release();
  }
}