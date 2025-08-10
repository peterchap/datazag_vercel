import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getUserFromBearerToken } from '@/lib/auth';
import crypto from 'crypto';

// Generate a secure API key
function generateAPIKey() {
  return 'datazag_' + crypto.randomBytes(32).toString('hex');
}

// GET /api/api-keys - List the current user's API keys
export async function GET(request: Request) {
  const client = await pool.connect();
  
  try {
    // Extract user ID from Bearer token
    const auth = await getUserFromBearerToken(request);
    if (!auth || auth.error) {
      return NextResponse.json({
        success: false,
        error: auth?.error || 'Authentication required'
      }, { status: 401 });
    }

    const { userId } = auth;

    // Get API keys for the current user
    const result = await client.query(
      `SELECT 
        id, api_key, name, active, created_at
       FROM api_keys 
       WHERE user_id = $1 
       ORDER BY created_at DESC`,
      [userId]
    );

    return NextResponse.json({
      success: true,
      keys: result.rows.map(row => ({
        id: row.id,
        key: row.api_key,
        name: row.name,
        active: row.active,
        created_at: row.created_at
      }))
    });

  } catch (error: any) {
    console.error('API keys retrieval error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  } finally {
    client.release();
  }
}

// POST /api/api-keys - Create an API key for the current user
export async function POST(request: Request) {
  const client = await pool.connect();
  
  try {
    // Extract user ID from Bearer token
    const auth = await getUserFromBearerToken(request);
    if (!auth || auth.error) {
      return NextResponse.json({
        success: false,
        error: auth?.error || 'Authentication required'
      }, { status: 401 });
    }

    const { userId } = auth;

    const body = await request.json();
    const { name, description } = body;

    if (!name) {
      return NextResponse.json({
        success: false,
        error: 'name is required'
      }, { status: 400 });
    }

    // Generate API key
    const apiKey = generateAPIKey();

    // Begin transaction
    await client.query('BEGIN');

    // Create API key in database
    const keyResult = await client.query(`
      INSERT INTO api_keys (
        user_id, api_key, name, 
        active, created_at
      ) VALUES ($1, $2, $3, true, NOW())
      RETURNING id, api_key, name, active, created_at
    `, [userId, apiKey, name]);

    const newKey = keyResult.rows[0];

    await client.query('COMMIT');

    // Get user details for Redis sync (optional)
    const userResult = await client.query(
      'SELECT id, email, credits FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length > 0) {
      const user = userResult.rows[0];
      // Sync to Redis (don't block response)
      syncAPIKeyToRedis(apiKey, user.credits, user.email);
    }

    return NextResponse.json({
      success: true,
      message: 'API key created successfully',
      key: {
        id: newKey.id,
        key: newKey.api_key,
        name: newKey.name,
        active: newKey.active,
        created_at: newKey.created_at
      }
    }, { status: 201 });

  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('API key creation error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  } finally {
    client.release();
  }
}

// Helper function to sync API key to Redis (async, non-blocking)
async function syncAPIKeyToRedis(apiKey: string, credits: number, userEmail: string) {
  if (!process.env.REDIS_API_URL || !process.env.INTERNAL_API_TOKEN) {
    console.log('⚠️  Redis sync skipped - missing configuration');
    return;
  }

  try {
    const response = await fetch(`${process.env.REDIS_API_URL}/redis/sync-key`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Token': process.env.INTERNAL_API_TOKEN
      },
      body: JSON.stringify({
        apiKey,
        credits,
        userEmail,
        active: true,
        syncedAt: new Date().toISOString()
      })
    });

    if (response.ok) {
      console.log(`✅ API key synced to Redis: ${apiKey}`);
    } else {
      console.log(`⚠️  Redis sync failed for ${apiKey}: ${response.statusText}`);
    }
  } catch (error: any) {
    console.log(`⚠️  Redis sync error for ${apiKey}: ${error.message}`);
  }
}