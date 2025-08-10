// API endpoint for deleting individual API keys (admin-only)
import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { validateAdminAuth } from '@/lib/adminAuth';
import { handleCorsPreflightRequest, validateCorsForActualRequest, handleCorsHeaders } from '@/lib/cors';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Handle CORS preflight requests
export async function OPTIONS(request: NextRequest) {
  const corsResponse = handleCorsPreflightRequest(request);
  if (corsResponse) return corsResponse;

  // This shouldn't happen, but fallback
  return new NextResponse(null, { status: 204 });
}

// Delete API key (admin-only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Handle CORS for actual request
  const corsError = validateCorsForActualRequest(request);
  if (corsError) return corsError;

  // Validate admin authentication
  const authError = validateAdminAuth(request);
  if (authError) return authError;

  const client = await pool.connect();
  
  try {
    const keyId = params.id;

    if (!keyId || isNaN(Number(keyId))) {
      const response = NextResponse.json({
        success: false,
        error: 'Invalid API key ID'
      }, { status: 400 });
      return handleCorsHeaders(request, response);
    }

    // Check if API key exists first
    const existsResult = await client.query(
      'SELECT id, key_name FROM api_keys WHERE id = $1',
      [keyId]
    );

    if (existsResult.rows.length === 0) {
      const response = NextResponse.json({
        success: false,
        error: 'API key not found'
      }, { status: 404 });
      return handleCorsHeaders(request, response);
    }

    const apiKey = existsResult.rows[0];

    // Delete the API key
    await client.query(
      'DELETE FROM api_keys WHERE id = $1',
      [keyId]
    );

    const response = NextResponse.json({
      success: true,
      message: 'API key deleted successfully',
      deleted_key: {
        id: apiKey.id,
        name: apiKey.key_name
      }
    }, { status: 200 });

    return handleCorsHeaders(request, response);

  } catch (error: any) {
    console.error('API key deletion error:', error);
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