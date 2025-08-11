// Enhanced API key creation with Redis sync
// File: pages/api/keys.js

import { pool } from '../../lib/db';

const REDIS_API_URL = process.env.REDIS_API_URL;
const INTERNAL_TOKEN = process.env.INTERNAL_API_TOKEN;

// Redis sync function with error handling
async function syncToRedis(apiKey, userId, credits) {
  if (!REDIS_API_URL || !INTERNAL_TOKEN) {
    console.warn('Redis sync skipped - configuration missing');
    return { success: false, reason: 'config_missing' };
  }

  try {
    // Try the working endpoint pattern we discovered
    const response = await fetch(`${REDIS_API_URL}/redis/api-key`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Token': INTERNAL_TOKEN
      },
      body: JSON.stringify({
        key: apiKey,
        user_id: userId,
        credits: credits,
        active: true
      })
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Redis sync successful:', data);
      return { success: true, data };
    } else {
      console.warn(`⚠️ Redis sync failed: ${response.status} ${response.statusText}`);
      return { success: false, reason: response.statusText };
    }
  } catch (error) {
    console.error('❌ Redis sync error:', error.message);
    return { success: false, reason: error.message };
  }
}

export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      const { userId, name, description } = req.body;

      // 1. Create API key in PostgreSQL (this works perfectly)
      const apiKey = `datazag_${generateRandomKey()}`;
      
      const result = await pool.query(
        'INSERT INTO api_keys (user_id, api_key, key_name, is_active) VALUES ($1, $2, $3, $4) RETURNING *',
        [userId, apiKey, name, true]
      );

      const newKey = result.rows[0];

      // 2. Get user credits for Redis sync
      const userResult = await pool.query('SELECT credits FROM users WHERE id = $1', [userId]);
      const userCredits = userResult.rows[0]?.credits || 0;

      // 3. Attempt Redis sync (non-blocking)
      syncToRedis(apiKey, userId, userCredits).then(syncResult => {
        if (syncResult.success) {
          console.log(`✅ API key ${apiKey} synced to Redis`);
        } else {
          console.warn(`⚠️ API key ${apiKey} created but Redis sync failed: ${syncResult.reason}`);
          // Could store sync status in database for retry later
        }
      }).catch(error => {
        console.error(`❌ Redis sync error for ${apiKey}:`, error);
      });

      // 4. Return success immediately (don't block on Redis)
      res.status(200).json({
        success: true,
        key: newKey,
        message: 'API key created successfully'
      });

    } catch (error) {
      console.error('API key creation error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create API key'
      });
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}

function generateRandomKey() {
  return crypto.randomBytes(32).toString('hex');
}
