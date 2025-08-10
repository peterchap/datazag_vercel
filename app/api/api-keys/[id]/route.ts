import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getUserFromBearerToken } from '@/lib/auth';

// DELETE /api/api-keys/:id - Delete an API key by id (owned by the current user)
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
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
    const apiKeyId = parseInt(params.id);

    if (isNaN(apiKeyId)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid API key ID'
      }, { status: 400 });
    }

    // Begin transaction
    await client.query('BEGIN');

    // Check if the API key exists and belongs to the current user
    const checkResult = await client.query(
      'SELECT id, api_key FROM api_keys WHERE id = $1 AND user_id = $2',
      [apiKeyId, userId]
    );

    if (checkResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({
        success: false,
        error: 'API key not found or access denied'
      }, { status: 404 });
    }

    const apiKey = checkResult.rows[0].api_key;

    // Delete the API key
    await client.query(
      'DELETE FROM api_keys WHERE id = $1 AND user_id = $2',
      [apiKeyId, userId]
    );

    await client.query('COMMIT');

    // Remove from Redis (async, don't block response)
    removeAPIKeyFromRedis(apiKey);

    return NextResponse.json({
      success: true,
      message: 'API key deleted successfully'
    });

  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('API key deletion error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  } finally {
    client.release();
  }
}

// Helper function to remove API key from Redis (async, non-blocking)
async function removeAPIKeyFromRedis(apiKey: string) {
  if (!process.env.REDIS_API_URL || !process.env.INTERNAL_API_TOKEN) {
    console.log('⚠️  Redis cleanup skipped - missing configuration');
    return;
  }

  try {
    const response = await fetch(`${process.env.REDIS_API_URL}/redis/remove-key`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Token': process.env.INTERNAL_API_TOKEN
      },
      body: JSON.stringify({
        apiKey,
        removedAt: new Date().toISOString()
      })
    });

    if (response.ok) {
      console.log(`✅ API key removed from Redis: ${apiKey}`);
    } else {
      console.log(`⚠️  Redis removal failed for ${apiKey}: ${response.statusText}`);
    }
  } catch (error: any) {
    console.log(`⚠️  Redis removal error for ${apiKey}: ${error.message}`);
  }
}