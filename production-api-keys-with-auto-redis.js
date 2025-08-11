// Production-ready API key endpoint with automatic Redis sync
// File: pages/api/keys.js

import { pool } from '../../lib/db';

const REDIS_API_URL = process.env.REDIS_API_URL || 'https://redis-api-705890714749.europe-west2.run.app';
const INTERNAL_TOKEN = process.env.INTERNAL_API_TOKEN || 'BG-b6WuywK7NWFoUP';

// Automatic Redis sync function
async function syncToRedis(apiKey, userId, credits) {
  try {
    const response = await fetch(`${REDIS_API_URL}/redis/api-key`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Token': INTERNAL_TOKEN
      },
      body: JSON.stringify({
        api_key: apiKey,
        user_id: userId.toString(),
        credits: credits,
        active: true
      })
    });

    if (response.ok) {
      console.log(`✅ API key ${apiKey} synced to Redis automatically`);
      return { success: true };
    } else {
      console.warn(`⚠️ Redis sync failed for ${apiKey}: ${response.statusText}`);
      return { success: false, reason: response.statusText };
    }
  } catch (error) {
    console.error(`❌ Redis sync error for ${apiKey}:`, error.message);
    return { success: false, reason: error.message };
  }
}

// Enhanced credit update function
async function updateRedisCredits(apiKey, remainingCredits) {
  try {
    const response = await fetch(`${REDIS_API_URL}/redis/credits/${apiKey}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Token': INTERNAL_TOKEN
      },
      body: JSON.stringify({ credits: remainingCredits })
    });

    if (response.ok) {
      console.log(`✅ Credits updated in Redis for ${apiKey}: ${remainingCredits}`);
      return { success: true };
    }
  } catch (error) {
    console.error(`❌ Redis credit update error:`, error.message);
  }
  return { success: false };
}

export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      const { userId, name, description } = req.body;

      // 1. Create API key in PostgreSQL
      const apiKey = `datazag_${crypto.randomBytes(32).toString('hex')}`;
      
      const result = await pool.query(
        'INSERT INTO api_keys (user_id, api_key, key_name, is_active) VALUES ($1, $2, $3, $4) RETURNING *',
        [userId, apiKey, name, true]
      );

      // 2. Get user credits
      const userResult = await pool.query('SELECT credits FROM users WHERE id = $1', [userId]);
      const userCredits = userResult.rows[0]?.credits || 0;

      // 3. Automatic Redis sync (non-blocking)
      syncToRedis(apiKey, userId, userCredits);

      // 4. Return success immediately
      res.status(200).json({
        success: true,
        key: result.rows[0],
        message: 'API key created and synced to Redis'
      });

    } catch (error) {
      console.error('API key creation error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create API key'
      });
    }
  }
}

// Export the helper functions for use in usage reporting
export { updateRedisCredits };
