// Session-based API key management for the portal UI (no admin secret, no CORS hurdles)
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { pool } from '@/lib/db';
import { getCurrentUser } from '@/lib/getCurrentUser';

function generateAPIKey() {
  return 'datazag_' + crypto.randomBytes(32).toString('hex');
}

// GET /api/api-keys - list current user's keys
export async function GET(request: NextRequest) {
  const user = await getCurrentUser(request);
  if (!user?.id) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const client = await pool.connect();
  try {
    const result = await client.query(
      `
      SELECT 
        id,
        key AS key,
        name AS name,
        active AS active,
        created_at
      FROM api_keys
      WHERE user_id = $1
      ORDER BY created_at DESC
      `,
      [String(user.id)]
    );

    return NextResponse.json({
      success: true,
      keys: result.rows,
    });
  } catch (error: any) {
    console.error('Get API keys error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

// POST /api/api-keys - create a key for current user
export async function POST(request: NextRequest) {
  const user = await getCurrentUser(request);
  if (!user?.id) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const client = await pool.connect();
  try {
    const body = await request.json().catch(() => ({}));
    const name = body?.name;
    if (!name || typeof name !== 'string') {
      return NextResponse.json({ success: false, error: 'name is required' }, { status: 400 });
    }

    const apiKey = generateAPIKey();

    await client.query('BEGIN');
    const inserted = await client.query(
      `
      INSERT INTO api_keys (
        user_id, key, name, active, created_at
      ) VALUES ($1, $2, $3, true, NOW())
      RETURNING id, key AS key, name AS name, active AS active, created_at
      `,
      [String(user.id), apiKey, name]
    );
    await client.query('COMMIT');

    // You may also sync to Redis here if desired.

    return NextResponse.json(
      {
        success: true,
        key: inserted.rows[0],
      },
      { status: 201 }
    );
  } catch (error: any) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Create API key error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}