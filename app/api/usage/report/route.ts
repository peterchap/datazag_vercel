// API endpoint to test external API integration
import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

export async function POST(request: Request) {
  const client = await pool.connect();
  
  try {
    const body = await request.json();
    const { 
      userId, 
      apiKeyId, 
      creditsUsed = 5, 
      queryType = 'standard',
      endpoint = 'unknown',
      metadata = {} 
    } = body;

    console.log('📡 Received usage report:', {
      userId,
      apiKeyId,
      creditsUsed,
      queryType,
      endpoint
    });

    // Validate required fields
    if (!userId || !creditsUsed) {
      return NextResponse.json({
        success: false,
        error: 'userId and creditsUsed are required'
      }, { status: 400 });
    }

    // Begin transaction
    await client.query('BEGIN');

    // Check current user credits
    const userResult = await client.query(
      'SELECT id, email, credits FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({
        success: false,
        error: 'User not found'
      }, { status: 404 });
    }

    const user = userResult.rows[0];
    const currentCredits = user.credits;

    if (currentCredits < creditsUsed) {
      await client.query('ROLLBACK');
      return NextResponse.json({
        success: false,
        error: 'Insufficient credits',
        currentCredits,
        requiredCredits: creditsUsed
      }, { status: 402 });
    }

    // Record API usage in transactions table as a credit deduction
    await client.query(`
      INSERT INTO transactions (user_id, amount, type, description, created_at)
      VALUES ($1, $2, 'debit', $3, NOW())
    `, [
      userId,
      -creditsUsed,
      `API usage: ${queryType} (${endpoint}) - API Key: ${apiKeyId || 'direct'}`
    ]);

    // Deduct credits from user
    const updateResult = await client.query(
      'UPDATE users SET credits = credits - $1 WHERE id = $2 RETURNING credits',
      [creditsUsed, userId]
    );

    const newCredits = updateResult.rows[0].credits;

    // Record transaction
    await client.query(`
      INSERT INTO transactions (user_id, amount, type, description, created_at)
      VALUES ($1, $2, 'debit', $3, NOW())
    `, [
      userId,
      -creditsUsed,
      `API usage: ${queryType} (${endpoint}) - Additional record`
    ]);

    await client.query('COMMIT');

    // Update Redis credits (don't block response)
    updateRedisCredits(apiKeyId, newCredits);

    return NextResponse.json({
      success: true,
      message: 'Usage recorded successfully',
      remainingCredits: newCredits,
      creditsUsed,
      endpoint,
      queryType,
      usageDateTime: new Date().toISOString(),
      user: {
        id: user.id,
        email: user.email,
        previousCredits: currentCredits,
        newCredits
      }
    });

  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Usage reporting error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error.message
    }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function GET() {
  const client = await pool.connect();
  
  try {
    // Get recent API usage stats from transactions
    const usageStats = await client.query(`
      SELECT 
        COUNT(*) as total_requests,
        SUM(ABS(amount)) as total_credits_used,
        AVG(ABS(amount)) as avg_credits_per_request,
        COUNT(DISTINCT user_id) as unique_users
      FROM transactions 
      WHERE type = 'debit' 
        AND description LIKE 'API usage:%'
        AND created_at > NOW() - INTERVAL '24 hours'
    `);

    // Get top users by usage from transactions
    const topUsers = await client.query(`
      SELECT 
        u.email,
        u.credits as current_credits,
        SUM(ABS(t.amount)) as credits_used_today,
        COUNT(t.id) as requests_today
      FROM users u
      JOIN transactions t ON u.id = t.user_id
      WHERE t.type = 'debit' 
        AND t.description LIKE 'API usage:%'
        AND t.created_at > NOW() - INTERVAL '24 hours'
      GROUP BY u.id, u.email, u.credits
      ORDER BY credits_used_today DESC
      LIMIT 10
    `);

    // Get system health from transactions
    const systemHealth = await client.query(`
      SELECT 
        COUNT(DISTINCT user_id) as active_users_today,
        COUNT(*) as total_requests_today,
        SUM(ABS(amount)) as total_credits_consumed_today
      FROM transactions 
      WHERE type = 'debit' 
        AND description LIKE 'API usage:%'
        AND created_at > NOW() - INTERVAL '24 hours'
    `);

    return NextResponse.json({
      success: true,
      stats: {
        summary: usageStats.rows[0],
        topUsers: topUsers.rows,
        systemHealth: systemHealth.rows[0]
      },
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Stats retrieval error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  } finally {
    client.release();
  }
}

// Helper function to update Redis (async, non-blocking)
async function updateRedisCredits(apiKey: string | null, credits: number) {
  if (!apiKey || !process.env.REDIS_API_URL || !process.env.INTERNAL_API_TOKEN) {
    console.log('⚠️  Redis update skipped - missing configuration');
    return;
  }

  try {
    const response = await fetch(`${process.env.REDIS_API_URL}/redis/credits/${apiKey}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Token': process.env.INTERNAL_API_TOKEN
      },
      body: JSON.stringify({ credits })
    });

    if (response.ok) {
      console.log(`✅ Redis updated for ${apiKey}: ${credits} credits`);
    } else {
      console.log(`⚠️  Redis update failed for ${apiKey}: ${response.statusText}`);
    }
  } catch (error: any) {
    console.log(`⚠️  Redis update error for ${apiKey}: ${error.message}`);
  }
}
