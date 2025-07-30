// API endpoint for creating and managing API keys
import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import crypto from 'crypto';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Generate a secure API key
function generateAPIKey() {
  return 'datazag_' + crypto.randomBytes(32).toString('hex');
}

// Create API key
export async function POST(request: Request) {
  const client = await pool.connect();
  
  try {
    const body = await request.json();
    const { userId, name, description } = body;

    if (!userId || !name) {
      return NextResponse.json({
        success: false,
        error: 'userId and name are required'
      }, { status: 400 });
    }

    // Generate API key
    const apiKey = generateAPIKey();
    
    // Get user details for Redis sync
    const userResult = await client.query(
      'SELECT id, email, credits FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'User not found'
      }, { status: 404 });
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

    // Sync to Redis (don't block response)
    syncAPIKeyToRedis(apiKey, user.credits, user.email);

    return NextResponse.json({
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

  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('API key creation error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error.message
    }, { status: 500 });
  } finally {
    client.release();
  }
}

// Get API keys for a user
export async function GET(request: Request) {
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

    return NextResponse.json({
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

  } catch (error: any) {
    console.error('API keys retrieval error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
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
