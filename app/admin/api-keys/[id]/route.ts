// Admin-only delete (moved), retains X-Admin-Secret + strict CORS
import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/drizzle';
import {
  handleCorsPreflightRequest,
  validateCorsForActualRequest,
  handleCorsHeaders,
} from '@/lib/cors';
import { validateAdminAuth } from '@/lib/adminAuth';

// Handle CORS preflight requests
export async function OPTIONS(request: NextRequest) {
  const corsResponse = handleCorsPreflightRequest(request);
  if (corsResponse) return corsResponse;
  return new NextResponse(null, { status: 204 });
}

export async function DELETE(
  request: NextRequest,
  context: { params: { id: string } } | any
) {
  const { params } = context as { params: { id: string } };
  const corsError = validateCorsForActualRequest(request);
  if (corsError) return corsError;

  const authError = validateAdminAuth(request);
  if (authError) return authError;

  const client = await pool.connect();
  try {
    const keyId = params.id;
    if (!keyId || isNaN(Number(keyId))) {
      const response = NextResponse.json(
        { success: false, error: 'Invalid API key ID' },
        { status: 400 }
      );
      return handleCorsHeaders(request, response);
    }

    const exists = await client.query(
      'SELECT id, name FROM api_keys WHERE id = $1',
      [Number(keyId)]
    );
    if (exists.rows.length === 0) {
      const response = NextResponse.json(
        { success: false, error: 'API key not found' },
        { status: 404 }
      );
      return handleCorsHeaders(request, response);
    }

  const apiKey = exists.rows[0];
    await client.query('DELETE FROM api_keys WHERE id = $1', [Number(keyId)]);

    const response = NextResponse.json(
      {
        success: true,
        message: 'API key deleted successfully',
  deleted_key: { id: apiKey.id, name: apiKey.name },
      },
      { status: 200 }
    );
    return handleCorsHeaders(request, response);
  } catch (error: any) {
    console.error('Admin delete API key error:', error);
    const response = NextResponse.json(
      { success: false, error: 'Internal server error', details: error.message },
      { status: 500 }
    );
    return handleCorsHeaders(request, response);
  } finally {
    client.release();
  }
}