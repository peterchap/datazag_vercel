
/**
 * API Gateway Server Launcher
 * 
 * This script starts the API Gateway in production mode with proper error handling
 * and can be used with process managers like PM2.
 */

// Load environment variables with fallbacks similar to index.js
const fs = require('fs');
const path = require('path');
(() => {
  const cwd = process.cwd();
  const localEnv = path.resolve(cwd, '.env.local');
  const dotEnv = path.resolve(cwd, '.env');
  const parentLocal = path.resolve(cwd, '..', '.env.local');
  const parentEnv = path.resolve(cwd, '..', '.env');

  if (fs.existsSync(localEnv)) {
    require('dotenv').config({ path: localEnv });
  } else if (fs.existsSync(dotEnv)) {
    require('dotenv').config({ path: dotEnv });
  } else if (fs.existsSync(parentLocal)) {
    require('dotenv').config({ path: parentLocal });
  } else if (fs.existsSync(parentEnv)) {
    require('dotenv').config({ path: parentEnv });
  } else {
    require('dotenv').config();
  }

  // Dev-friendly fallbacks
  if (!process.env.JWT_SECRET && process.env.NEXTAUTH_SECRET) {
    process.env.JWT_SECRET = process.env.NEXTAUTH_SECRET;
  }
  if (!process.env.API_SERVICE_KEY && process.env.INTERNAL_API_TOKEN) {
    process.env.API_SERVICE_KEY = process.env.INTERNAL_API_TOKEN;
  }
})();

// Import the server setup
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { redisSyncService } = require('../lib/redis-sync-js');

// Basic validation
if (!process.env.DATABASE_URL) {
  console.error('Missing DATABASE_URL environment variable');
  console.error('Tip: create a .env.local in c\\Code\\Customer_Portal or in c\\Code\\Customer_Portal\\api-gateway with DATABASE_URL=...');
  process.exit(1);
}

// Ensure critical secrets are present
if (!process.env.JWT_SECRET) {
  console.error('Missing JWT_SECRET environment variable');
  process.exit(1);
}
if (!process.env.API_SERVICE_KEY) {
  console.warn('API_SERVICE_KEY not configured. Internal service-key routes will return 403 until set.');
}

// Initialize Express app
const app = express();
const port = process.env.PORT || 3000;

// Trust only loopback proxies (Next dev server) to satisfy express-rate-limit without being overly permissive
app.set('trust proxy', 'loopback');

// Configure middleware
// Preserve raw body for Stripe webhook verification
app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));
const Stripe = require('stripe');
const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

// Configure CORS
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',') 
  : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:5000'];

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true
}));

// Configure rate limiting
const limiter = rateLimit({
  windowMs: process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000, // 15 minutes
  max: process.env.RATE_LIMIT_MAX_REQUESTS || 100, // Limit each IP to 100 requests per window
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  message: 'Too many requests from this IP, please try again later'
});

// Apply rate limiting to all requests
app.use(limiter);

// Database connection - use the simple approach that works reliably
let sslConfig;
try {
  if (process.env.DB_USE_SSL === 'false') {
    sslConfig = false;
  } else if (process.env.DB_USE_SSL === 'true') {
    sslConfig = { rejectUnauthorized: false };
  } else {
    const dbUrl = new URL(process.env.DATABASE_URL);
    const host = dbUrl.hostname;
    const sslMode = dbUrl.searchParams.get('sslmode');
    if (host === 'localhost' || host === '127.0.0.1' || sslMode === 'disable') {
      sslConfig = false;
    } else {
      sslConfig = { rejectUnauthorized: false };
    }
  }
} catch {
  sslConfig = { rejectUnauthorized: false };
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: sslConfig,
  connectionTimeoutMillis: 10000,
  max: 10,
  idleTimeoutMillis: 30000
});

// Log pool-level errors
pool.on('error', (err) => {
  console.error('[pg pool error]', err);
});

// Helper: ensure user has at least one API key, handling schemas without an `active` column
async function ensureUserApiKey(client, userId) {
  // Try find existing active key
  try {
    const { rows } = await client.query(
      'SELECT id, key, user_id FROM api_keys WHERE user_id = $1 AND active = true LIMIT 1',
      [userId]
    );
    if (rows.length) return { existing: rows[0], created: null };
  } catch (e) {
    if (e && e.code !== '42703') throw e;
  }
  // Fallback without `active`
  try {
    const { rows } = await client.query(
      'SELECT id, key, user_id FROM api_keys WHERE user_id = $1 ORDER BY created_at DESC NULLS LAST LIMIT 1',
      [userId]
    );
    if (rows.length) return { existing: rows[0], created: null };
  } catch (e) {
    // If even this fails, bubble up
    throw e;
  }
  // None found -> create
  const key = `api_${userId}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  try {
    const ins = await client.query(
      'INSERT INTO api_keys (user_id, key, name, active) VALUES ($1, $2, $3, $4) RETURNING id, key, user_id, active',
      [userId, key, 'Default Key', true]
    );
    return { existing: null, created: ins.rows[0] };
  } catch (e) {
    if (e && e.code === '42703') {
      const ins = await client.query(
        'INSERT INTO api_keys (user_id, key, name) VALUES ($1, $2, $3) RETURNING id, key, user_id',
        [userId, key, 'Default Key']
      );
      return { existing: null, created: ins.rows[0] };
    }
    throw e;
  }
}

// Helper: insert a credit transaction; handle schemas with/without a required `status` column
async function insertTransaction(client, { userId, amount, description }) {
  try {
    // Try with a status column first, common in stricter schemas
    await client.query(
      `INSERT INTO transactions (user_id, amount, type, description, status, created_at)
       VALUES ($1, $2, 'credit', $3, $4, NOW())`,
      [userId, amount, description, 'completed']
    );
  } catch (e) {
    if (e && e.code === '42703') {
      // Column does not exist -> fallback without `status`
      await client.query(
        `INSERT INTO transactions (user_id, amount, type, description, created_at)
         VALUES ($1, $2, 'credit', $3, NOW())`,
        [userId, amount, description]
      );
    } else {
      throw e;
    }
  }
}

// Test database connection on startup
pool.query('SELECT NOW()', (err, result) => {
  if (err) {
    console.error('Database connection error:', err);
    process.exit(1);
  } else {
    console.log('Database connected successfully at', result.rows[0].now);
  }
});

// JWT Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    console.warn('[auth:jwt] missing token');
    return res.status(401).json({ message: 'Authentication required' });
  }
  
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      console.warn('[auth:jwt] verify failed', { message: err.message });
      return res.status(403).json({ message: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Service API key middleware for internal services
const authenticateServiceKey = (req, res, next) => {
  const apiKey = req.headers['x-api-service-key'];
  
  if (!apiKey || apiKey !== process.env.API_SERVICE_KEY) {
  const provided = apiKey ? `${String(apiKey).slice(0, 6)}...` : 'missing';
  const expected = process.env.API_SERVICE_KEY ? `${String(process.env.API_SERVICE_KEY).slice(0, 6)}...` : 'missing';
  console.warn('[auth:service-key] reject', { provided, expected, hasEnv: !!process.env.API_SERVICE_KEY });
  return res.status(403).json({ message: 'Invalid service API key' });
  }
  
  next();
};

// Role-based authorization middleware
const authorize = (roles = []) => {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: 'Authentication required' });
    
    if (roles.length && !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }
    
    next();
  };
};

// Health check endpoint - accessible without authentication
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Internal: Claim a free bundle on behalf of a user (service key required)
app.post('/api/internal/claim-free-bundle', authenticateServiceKey, async (req, res) => {
  const started = Date.now();
  console.log('[internal claim-free-bundle] start', { body: req.body });
  try {
    const { bundleId, userId } = req.body || {};
    if (!bundleId || !userId) return res.status(400).json({ message: 'bundleId and userId are required' });

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query("SET LOCAL statement_timeout TO '5000ms'");
      console.log('[internal claim-free-bundle] transaction started');

      // Load bundle with schema-agnostic approach; treat inactive bundles if `active` exists
      const { rows: bundleRows } = await client.query('SELECT * FROM credit_bundles WHERE id = $1', [bundleId]);
      const bundle = bundleRows[0];
      if (!bundle) { await client.query('ROLLBACK'); return res.status(404).json({ message: 'Bundle not found' }); }
      if (Object.prototype.hasOwnProperty.call(bundle, 'active') && bundle.active === false) {
        await client.query('ROLLBACK');
        return res.status(404).json({ message: 'Bundle not found' });
      }
      const price = Number(bundle.price || 0);
      const creditsToGrant = Number(bundle.credits || 0);
      if (price > 0) { await client.query('ROLLBACK'); return res.status(400).json({ message: 'This bundle is not free' }); }

      // Prevent duplicate claiming: check prior free activation transaction
      const { rows: priorTx } = await client.query(
        `SELECT id FROM transactions 
         WHERE user_id = $1 AND type = 'credit' AND description LIKE 'Free plan activation:%' 
         LIMIT 1`,
        [userId]
      );
      if (priorTx.length) {
        await client.query('ROLLBACK');
        return res.status(409).json({ message: 'Free plan already activated' });
      }
      const update = await client.query(
        'UPDATE users SET credits = COALESCE(credits,0) + $1 WHERE id = $2 RETURNING credits',
  [creditsToGrant, userId]
      );
      if (!update.rowCount) {
        await client.query('ROLLBACK');
        return res.status(404).json({ message: 'User not found' });
      }
      const newCredits = update.rows[0].credits;

      await insertTransaction(client, {
        userId,
  amount: creditsToGrant,
  description: `Free plan activation: ${bundle.name || bundle.id}`,
      });

      // Ensure at least one API key (handles schemas without `active` column)
      let createdApiKey = null;
      const { existing, created } = await ensureUserApiKey(client, userId);
      if (created) {
        createdApiKey = created;
      }

  await client.query('COMMIT');
  console.log('[internal claim-free-bundle] commit', { ms: Date.now() - started });

      // Async Redis sync
      try {
        // Update by user id (legacy) and by api key (production bg_public_api usage)
        redisSyncService.updateCredits(userId, newCredits).catch(() => {});
        if (createdApiKey) {
          redisSyncService.registerApiKey({
            key: createdApiKey.key,
            user_id: createdApiKey.user_id,
            credits: newCredits,
            active: true,
          }).catch(() => {});
          redisSyncService.updateCreditsByApiKey(createdApiKey.key, newCredits).catch(() => {});
        }
      } catch {}

      const payload = {
        success: true,
  credited: creditsToGrant,
        newCredits,
        apiKeyCreated: !!createdApiKey,
        apiKey: createdApiKey ? createdApiKey.key : undefined,
      };
      console.log('[internal claim-free-bundle] success', { ms: Date.now() - started, payload });
      return res.status(200).json(payload);
    } catch (e) {
      await client.query('ROLLBACK');
      console.error('[internal claim-free-bundle] rollback', { ms: Date.now() - started, error: e && e.message, code: e && e.code });
      const dev = process.env.NODE_ENV !== 'production';
      return res.status(500).json({ message: 'Failed to claim free plan', error: dev ? (e && (e.message || e.code)) : undefined });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('[internal claim-free-bundle] error', { ms: Date.now() - started, error: error && error.message, code: error && error.code });
    const dev = process.env.NODE_ENV !== 'production';
    res.status(500).json({ message: 'Server error', error: dev ? (error && (error.message || error.code)) : undefined });
  }
});

// Public: Claim a free bundle for the authenticated user (JWT required)
app.post('/api/claim-free-bundle', authenticateToken, async (req, res) => {
  const started = Date.now();
  console.log('[claim-free-bundle] start', { body: req.body, userId: req.user && req.user.id });
  try {
    const { bundleId } = req.body || {};
    if (!bundleId) return res.status(400).json({ message: 'bundleId is required' });
    const userId = req.user.id;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query("SET LOCAL statement_timeout TO '5000ms'");
      console.log('[claim-free-bundle] transaction started');

      // Load bundle schema-agnostically
      const { rows: bundleRows2 } = await client.query('SELECT * FROM credit_bundles WHERE id = $1', [bundleId]);
      const bundle = bundleRows2[0];
      if (!bundle) { await client.query('ROLLBACK'); return res.status(404).json({ message: 'Bundle not found' }); }
      if (Object.prototype.hasOwnProperty.call(bundle, 'active') && bundle.active === false) {
        await client.query('ROLLBACK');
        return res.status(404).json({ message: 'Bundle not found' });
      }
      const price2 = Number(bundle.price || 0);
      const creditsToGrant2 = Number(bundle.credits || 0);
      if (price2 > 0) { await client.query('ROLLBACK'); return res.status(400).json({ message: 'This bundle is not free' }); }

      // Prevent duplicate claiming
      const { rows: priorTx } = await client.query(
        `SELECT id FROM transactions 
         WHERE user_id = $1 AND type = 'credit' AND description LIKE 'Free plan activation:%' 
         LIMIT 1`,
        [userId]
      );
      if (priorTx.length) {
        await client.query('ROLLBACK');
        return res.status(409).json({ message: 'Free plan already activated' });
      }
      const update = await client.query(
        'UPDATE users SET credits = COALESCE(credits,0) + $1 WHERE id = $2 RETURNING credits',
  [creditsToGrant2, userId]
      );
      if (!update.rowCount) {
        await client.query('ROLLBACK');
        return res.status(404).json({ message: 'User not found' });
      }
      const newCredits = update.rows[0].credits;

      await insertTransaction(client, {
        userId,
  amount: creditsToGrant2,
  description: `Free plan activation: ${bundle.name || bundle.id}`,
      });

      // Ensure at least one API key (handles schemas without `active` column)
      let createdApiKey = null;
      const { existing, created } = await ensureUserApiKey(client, userId);
      if (created) {
        createdApiKey = created;
      }

  await client.query('COMMIT');
  console.log('[claim-free-bundle] commit', { ms: Date.now() - started });

      // Sync credits/API key with Redis asynchronously
      try {
        // Update by user id (legacy) and by api key
        redisSyncService.updateCredits(userId, newCredits).catch(() => {});
        if (createdApiKey) {
          redisSyncService.registerApiKey({
            key: createdApiKey.key,
            user_id: createdApiKey.user_id,
            credits: newCredits,
            active: true,
          }).catch(() => {});
          redisSyncService.updateCreditsByApiKey(createdApiKey.key, newCredits).catch(() => {});
        }
      } catch {}

      const payload = {
        success: true,
  credited: creditsToGrant2,
        newCredits,
        apiKeyCreated: !!createdApiKey,
        apiKey: createdApiKey ? createdApiKey.key : undefined,
      };
      console.log('[claim-free-bundle] success', { ms: Date.now() - started, payload });
      return res.status(200).json(payload);
    } catch (e) {
      await client.query('ROLLBACK');
      console.error('[claim-free-bundle] rollback', { ms: Date.now() - started, error: e && e.message, code: e && e.code });
      const dev = process.env.NODE_ENV !== 'production';
      return res.status(500).json({ message: 'Failed to claim free plan', error: dev ? (e && (e.message || e.code)) : undefined });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('[claim-free-bundle] error', { ms: Date.now() - started, error: error && error.message, code: error && error.code });
    const dev = process.env.NODE_ENV !== 'production';
    res.status(500).json({ message: 'Server error', error: dev ? (error && (error.message || error.code)) : undefined });
  }
});

// FastAPI connection test endpoint - protected with API service key
app.get('/api/test-fastapi-connection', authenticateServiceKey, async (req, res) => {
  if (!process.env.FASTAPI_SERVICE_URL) {
    return res.status(500).json({ 
      status: 'error', 
      message: 'FASTAPI_SERVICE_URL environment variable is not set'
    });
  }

  try {
    // Test connection to the FastAPI service
    const response = await fetch(`${process.env.FASTAPI_SERVICE_URL}/api/health`, {
      headers: {
        'Authorization': `Bearer ${process.env.API_SERVICE_KEY}`
      },
      timeout: 5000 // 5 second timeout
    });
    
    if (response.ok) {
      const data = await response.json();
      res.json({
        status: 'connected',
        message: 'Successfully connected to FastAPI service',
        serviceResponse: data
      });
    } else {
      res.status(response.status).json({
        status: 'error',
        message: `FastAPI service returned status: ${response.status} ${response.statusText}`
      });
    }
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: `Connection error: ${error.message}`,
      hint: 'Check if FASTAPI_SERVICE_URL is correct and the service is running'
    });
  }
});

// Exchange rates endpoint - accessible without authentication
app.get('/api/exchange-rates', async (req, res) => {
  try {
    // Default exchange rates if API is unavailable
    const defaultRates = {
      base: "USD",
      rates: {
        EUR: 0.93,
        GBP: 0.79,
        JPY: 154.5,
        CAD: 1.38,
        AUD: 1.53,
        CNY: 7.24,
        INR: 83.42
      },
      timestamp: Date.now(),
      source: "default"
    };
    
    try {
      // Try to get live rates from a public API
      const response = await fetch('https://open.er-api.com/v6/latest/USD');
      
      if (response.ok) {
        const data = await response.json();
        res.status(200).json({
          base: data.base_code,
          rates: data.rates,
          timestamp: new Date(data.time_last_update_unix * 1000).getTime(),
          source: "openexchangerates"
        });
      } else {
        // Fall back to default rates
        console.log(`Exchange rate API returned status: ${response.status}`);
        res.status(200).json(defaultRates);
      }
    } catch (apiError) {
      // Fall back to default rates
      console.log(`Exchange rate API error: ${apiError.message}`);
      res.status(200).json(defaultRates);
    }
  } catch (error) {
    console.error('Error fetching exchange rates:', error);
    res.status(500).json({ message: 'Server error', details: error.message });
  }
});

// Schema information endpoint (for debugging only - protect this in production)
app.get('/api/debug/schema', authenticateServiceKey, async (req, res) => {
  try {
    // Query table information
    const tablesResult = await pool.query(`
      SELECT table_name, table_schema
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    // Get column information for tables
    const columnsPromises = tablesResult.rows.map(async (table) => {
      const columnResult = await pool.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_schema = $1 AND table_name = $2
        ORDER BY ordinal_position
      `, [table.table_schema, table.table_name]);
      
      return {
        tableName: table.table_name,
        columns: columnResult.rows
      };
    });
    
    const schemaInfo = await Promise.all(columnsPromises);
    
    res.status(200).json({
      tables: tablesResult.rows,
      schema: schemaInfo
    });
  } catch (error) {
    console.error('Error fetching schema information:', error);
    res.status(500).json({ message: 'Server error', details: error.message });
  }
});

// Credit bundles endpoint - accessible without authentication
app.get('/api/credit-bundles', async (req, res) => {

// Create Stripe Checkout Session for credits purchase (Test mode uses test API key)
app.post('/api/stripe/checkout-credits', async (req, res) => {
  try {
    if (!stripe) {
      return res.status(500).json({ error: 'Stripe not configured. Missing STRIPE_SECRET_KEY.' });
    }
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Authentication required' });
    let user;
    try {
      user = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }

    const { bundleId } = req.body || {};
    if (!bundleId) return res.status(400).json({ error: 'bundleId is required' });

    const { rows } = await pool.query(
      'SELECT id, name, description, credits, price FROM credit_bundles WHERE id = $1 AND active = true',
      [bundleId]
    );
    const bundle = rows[0];
    if (!bundle) return res.status(404).json({ error: 'Bundle not found' });

    const appBaseUrl = process.env.APP_BASE_URL || 'http://localhost:5000';
    const successUrl = `${appBaseUrl}/credits?success=1`;
    const cancelUrl = `${appBaseUrl}/credits?canceled=1`;

    // Normalize price to dollars first, correcting common mis-scalings (e.g., 0.79 or 7900)
    const rawPrice = Number(bundle.price);
    let normalizedDollars = 0;
    if (Number.isFinite(rawPrice)) {
      if (rawPrice > 0 && rawPrice < 20 && Math.abs(rawPrice - Math.round(rawPrice)) > 1e-6) {
        // Likely stored as dollars with decimals (e.g., 0.79 or 4.99) where project expects whole dollars (79, 499)
        normalizedDollars = Math.round(rawPrice * 100);
      } else if (rawPrice >= 1000 && rawPrice % 100 === 0) {
        // Likely stored as cents (e.g., 7900) instead of dollars
        normalizedDollars = Math.round(rawPrice / 100);
      } else {
        // Assume already whole dollars (e.g., 79, 499, 999) or small whole-dollar prices (<20)
        normalizedDollars = Math.round(rawPrice);
      }
    }
    // Stripe expects cents
    const unitAmount = normalizedDollars * 100;
    console.log('[Stripe] start-server checkout', { bundleId: bundle.id, rawPrice, normalizedDollars, unitAmount });

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      payment_method_types: ['card'],
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: process.env.STRIPE_CURRENCY || 'usd',
            unit_amount: unitAmount,
            product_data: {
              name: `${bundle.name} Credits`,
              description: bundle.description || undefined,
            },
          },
        },
      ],
      metadata: {
        userId: String(user.id),
        bundleId: String(bundle.id),
        credits: String(bundle.credits),
      },
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('Error creating Stripe checkout session:', err);
    return res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

// Debug: Preview computed Stripe unit amount for a bundle (token-protected)
app.get('/api/stripe/preview-amount', async (req, res) => {
  try {
    const token = (req.query.token || req.headers['x-internal-token'] || '').toString();
    if (!token || token !== (process.env.INTERNAL_API_TOKEN || '')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const bundleId = Number(req.query.bundleId || 0);
    if (!bundleId) return res.status(400).json({ error: 'bundleId is required' });
    const { rows } = await pool.query(
      'SELECT id, name, description, credits, price FROM credit_bundles WHERE id = $1 AND active = true',
      [bundleId]
    );
    const bundle = rows[0];
    if (!bundle) return res.status(404).json({ error: 'Bundle not found' });
    const rawPrice = Number(bundle.price);
    let normalizedDollars = 0;
    if (Number.isFinite(rawPrice)) {
      if (rawPrice > 0 && rawPrice < 20 && Math.abs(rawPrice - Math.round(rawPrice)) > 1e-6) {
        normalizedDollars = Math.round(rawPrice * 100);
      } else if (rawPrice >= 1000 && rawPrice % 100 === 0) {
        normalizedDollars = Math.round(rawPrice / 100);
      } else {
        normalizedDollars = Math.round(rawPrice);
      }
    }
    const unitAmount = normalizedDollars * 100;
    return res.json({ bundleId, name: bundle.name, rawPrice, normalizedDollars, unitAmount });
  } catch (e) {
    console.error('preview-amount error', e);
    return res.status(500).json({ error: 'server_error' });
  }
});

// Debug: Normalize a raw price value without DB lookup
app.get('/api/stripe/preview-normalize', async (req, res) => {
  try {
    const token = (req.query.token || req.headers['x-internal-token'] || '').toString();
    if (!token || token !== (process.env.INTERNAL_API_TOKEN || '')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const priceRaw = req.query.price;
    const price = Number(priceRaw);
    if (!Number.isFinite(price)) return res.status(400).json({ error: 'price must be a number' });
    let normalizedDollars = 0;
    if (price > 0 && price < 20 && Math.abs(price - Math.round(price)) > 1e-6) {
      normalizedDollars = Math.round(price * 100);
    } else if (price >= 1000 && price % 100 === 0) {
      normalizedDollars = Math.round(price / 100);
    } else {
      normalizedDollars = Math.round(price);
    }
    const unitAmount = normalizedDollars * 100;
    return res.json({ inputPrice: price, normalizedDollars, unitAmount });
  } catch (e) {
    console.error('preview-normalize error', e);
    return res.status(500).json({ error: 'server_error' });
  }
});

// Stripe webhook to grant credits after successful payment
app.post('/api/stripe/webhook-credits', async (req, res) => {
  try {
    if (!stripe) {
      return res.status(500).json({ error: 'Stripe not configured. Missing STRIPE_SECRET_KEY.' });
    }
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET_CREDITS;
    if (!webhookSecret) {
      console.warn('STRIPE_WEBHOOK_SECRET_CREDITS not set; cannot verify webhook signature');
      return res.status(500).json({ error: 'Webhook not configured' });
    }
    const sig = req.headers['stripe-signature'];
    let event;
    try {
      event = stripe.webhooks.constructEvent(req.rawBody, sig, webhookSecret);
    } catch (err) {
      console.error('Stripe webhook signature verification failed:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const meta = session.metadata || {};
      const userId = Number(meta.userId);
      const credits = Number(meta.credits) || 0;
      if (userId && credits > 0) {
        try {
          await pool.query('UPDATE users SET credits = COALESCE(credits,0) + $1 WHERE id = $2', [credits, userId]);
          console.log(`Credited ${credits} to user ${userId} (Stripe session ${session.id})`);
        } catch (dbErr) {
          console.error('Failed to credit user after Stripe payment:', dbErr.message);
        }
      }
    }
    return res.json({ received: true });
  } catch (err) {
    console.error('Stripe webhook handler error:', err);
    return res.status(500).json({ error: 'Internal webhook error' });
  }
});
  try {
    // Using the exact schema you provided: id, name, description, credits, price, popular
    const result = await pool.query(`
      SELECT id, name, description, credits, price, popular
      FROM credit_bundles
      ORDER BY credits ASC
    `);
    
    console.log(`Retrieved ${result.rows.length} credit bundles`);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error fetching credit bundles:', error);
    
    // If there was an error, check if there's a schema issue
    try {
      // Get column information for the credit_bundles table
      const columnsResult = await pool.query(`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'credit_bundles'
        ORDER BY ordinal_position
      `);
      
      console.log('Credit bundles table columns:', columnsResult.rows.map(r => r.column_name).join(', '));
      
      // Try a more basic query that should work regardless of specific columns
      const fallbackResult = await pool.query('SELECT * FROM credit_bundles');
      console.log(`Retrieved ${fallbackResult.rows.length} credit bundles using fallback query`);
      
      res.status(200).json(fallbackResult.rows);
    } catch (fallbackError) {
      // If even the fallback fails, return the original error
      console.error('Fallback query also failed:', fallbackError.message);
      res.status(500).json({ 
        message: 'Server error', 
        details: error.message,
        hint: 'Could not access credit_bundles table'
      });
    }
  }
});

// Authentication endpoints
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }
    
    // Get user from database
    const userResult = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    
    const user = userResult.rows[0];
    
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    
    // Check password
    const validPassword = await bcrypt.compare(password, user.password);
    
    if (!validPassword) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    
    // Create JWT token
    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '2d' }
    );
    
    // Return user data and token
    const { password: _, ...userWithoutPassword } = user;
    res.status(200).json({
      token,
      user: userWithoutPassword
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Register endpoint
app.post('/api/register', async (req, res) => {
  try {
    const { firstName, lastName, email, password, company } = req.body;
    
    // Validate required fields
    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }
    
    // Check if user already exists
    const existingUser = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    
    if (existingUser.rows.length > 0) {
      return res.status(409).json({ message: 'User with this email already exists' });
    }
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Insert new user
    const result = await pool.query(
      `INSERT INTO users (first_name, last_name, email, password, company, role, credits) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [firstName, lastName, email, hashedPassword, company || '', 'USER', 0]
    );
    
    const newUser = result.rows[0];
    
    // Create token
    const token = jwt.sign(
      { id: newUser.id, role: newUser.role },
      process.env.JWT_SECRET,
      { expiresIn: '2d' }
    );
    
    // Return user data and token
    const { password: _, ...userWithoutPassword } = newUser;
    res.status(201).json({
      token,
      user: userWithoutPassword
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Protected user route
app.get('/api/user', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, first_name, last_name, email, company, credits, role FROM users WHERE id = $1',
      [req.user.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Transform to match frontend schema
    const user = result.rows[0];
    res.status(200).json({
      id: user.id,
      firstName: user.first_name,
      lastName: user.last_name,
      username: `${user.first_name} ${user.last_name}`,
      email: user.email,
      company: user.company,
      credits: user.credits,
      role: user.role
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Start the server
const server = app.listen(port, '0.0.0.0', () => {
  console.log(`API Gateway running on port ${port} at ${new Date().toISOString()}`);
});

// Generic error handler to avoid socket hang-ups on unexpected errors
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  if (res.headersSent) return next(err);
  res.status(500).json({ message: 'Server error' });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    pool.end(() => {
      console.log('Database connection closed');
      process.exit(0);
    });
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    pool.end(() => {
      console.log('Database connection closed');
      process.exit(0);
    });
  });
});