/**
 * API Gateway for Database Access
 * 
 * This file creates a secure API server that sits between your Firebase-hosted frontend
 * and your PostgreSQL database. It handles authentication, authorization, and provides
 * endpoints for accessing and manipulating data.
 */

// Load environment variables with fallbacks
(() => {
  const fs = require('fs');
  const path = require('path');
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

  // Provide dev-friendly fallbacks
  if (!process.env.JWT_SECRET && process.env.NEXTAUTH_SECRET) {
    process.env.JWT_SECRET = process.env.NEXTAUTH_SECRET;
  }
  if (!process.env.API_SERVICE_KEY && process.env.INTERNAL_API_TOKEN) {
    process.env.API_SERVICE_KEY = process.env.INTERNAL_API_TOKEN;
  }
})();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { responseHandler, ResponseExamples } = require('./response-standards');
const { redisSyncService } = require('./redis-sync-js');

// Initialize Express app
const app = express();
const port = process.env.PORT || 3000;

// Configure middleware
// Preserve raw body for Stripe webhook verification
app.use(express.json({
  verify: (req, res, buf) => {
    // Save raw body for routes (e.g., Stripe webhook) that need signature verification
    req.rawBody = buf;
  }
}));
const Stripe = require('stripe');
const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

// Configure CORS
const defaultAllowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3001',
  'http://localhost:5000',
  'http://127.0.0.1:5000',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  // Wildcards to cover any localhost port like 3001, 4000, etc.
  'http://localhost:*',
  'http://127.0.0.1:*',
  'https://crm.datazag.com',
  'https://*.vercel.app'
];
const allowedOrigins = (process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',')
  : defaultAllowedOrigins).map(s => s.trim()).filter(Boolean);

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&');
const originMatches = (origin, patterns) => {
  if (!origin) return true;
  const o = origin.toLowerCase();
  return patterns.some(pat => {
    const p = pat.toLowerCase();
    if (p.includes('*')) {
      const re = new RegExp('^' + escapeRegex(p).replace(/\\\*/g, '.*') + '$');
      return re.test(o);
    }
    return o === p;
  });
};

const corsOptions = {
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    const o = origin.toLowerCase();
    // Always allow localhost (any port) for development
    if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\\d+)?$/.test(o)) {
      return callback(null, true);
    }
    if (!originMatches(origin, allowedOrigins)) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      console.warn(`[CORS] Blocked origin: ${origin}. Allowed: ${allowedOrigins.join(', ')}`);
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'authorization', 'Accept', 'X-Requested-With', 'x-api-service-key'],
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
// Explicitly handle preflight across all routes
app.options('*', cors(corsOptions));

// Configure rate limiting
const limiter = rateLimit({
  windowMs: process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000, // 15 minutes
  max: process.env.RATE_LIMIT_MAX_REQUESTS || 100, // Limit each IP to 100 requests per window
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  message: 'Too many requests from this IP, please try again later'
});

// Apply rate limiting to all requests
app.use(limiter);

// Initialize database connection pool
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL environment variable is required');
  console.error('Tip: create a .env.local in c\\\Code\\\Customer_Portal\\\api-gateway or in the parent folder with DATABASE_URL=...');
  process.exit(1);
}

console.log('Attempting to connect to database...');

// Use the exact connection configuration that worked in debug-connection.js
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

// Test database connection
pool.query('SELECT NOW()', (err, result) => {
  if (err) {
    console.error('Database connection error:', err);
    console.error('Error details:', err.message);
    console.error('Error code:', err.code);
    
    // Don't exit immediately - let's try to diagnose the issue
    console.log('Checking DATABASE_URL format...');
    try {
      // Parse but don't log sensitive credentials
      const url = new URL(process.env.DATABASE_URL);
      console.log('Database connection info:');
      console.log('- Protocol:', url.protocol);
      console.log('- Host:', url.hostname);
      console.log('- Port:', url.port);
      console.log('- Database:', url.pathname.substring(1));
      console.log('- SSL Mode:', url.searchParams.get('sslmode') || 'default');
    } catch (parseErr) {
      console.error('Invalid DATABASE_URL format:', parseErr.message);
    }
    
    process.exit(1);
  } else {
    console.log('Database connected successfully at', result.rows[0].now);
  }
});

// JWT Authentication middleware (supports Authorization header or cookie fallback)
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  let token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    // Try extracting from cookies: token, auth_token, jwt, access_token
    const cookieHeader = req.headers['cookie'] || '';
    const getCookie = (name) => {
      const match = cookieHeader.match(new RegExp('(?:^|; )' + name.replace(/([.*+?^${}()|[\]\\\\])/g, '\\$1') + '=([^;]*)'));
      return match ? decodeURIComponent(match[1]) : null;
    };
    token = getCookie('token') || getCookie('auth_token') || getCookie('jwt') || getCookie('access_token');
  }

  if (!token) return res.status(401).json({ message: 'Authentication required' });
  
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: 'Invalid or expired token' });
    req.user = user;
    next();
  });
};

// Service API key middleware for internal services
const authenticateServiceKey = (req, res, next) => {
  const apiKey = req.headers['x-api-service-key'];
  
  if (!apiKey || apiKey !== process.env.API_SERVICE_KEY) {
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

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Internal: Claim a free bundle on behalf of a user (service key required)
app.post('/api/internal/claim-free-bundle', authenticateServiceKey, async (req, res) => {
  try {
    const { bundleId, userId } = req.body || {};
    if (!bundleId || !userId) return res.status(400).json({ message: 'bundleId and userId are required' });

    // Load bundle and ensure it's free/active
    console.log('[claim-free-bundle] SQL:', 'SELECT id, name, description, credits, price FROM credit_bundles WHERE id = $1 AND active = true', [bundleId]);
    const { rows: bundleRows } = await pool.query(
      'SELECT id, name, description, credits, price FROM credit_bundles WHERE id = $1 AND active = true',
      [bundleId]
    );
    console.log('[claim-free-bundle] bundleRows:', bundleRows);
    const bundle = bundleRows[0];
    if (!bundle) return res.status(404).json({ message: 'Bundle not found' });
    if ((bundle.price || 0) > 0) return res.status(400).json({ message: 'This bundle is not free' });

    // Prevent duplicate claiming: check prior free activation transaction
    console.log('[claim-free-bundle] SQL:', `SELECT id FROM transactions WHERE user_id = $1 AND type = 'credit' AND description ILIKE 'Free plan activation:%' LIMIT 1`, [userId]);
    const { rows: priorTx } = await pool.query(
      `SELECT id FROM transactions 
       WHERE user_id = $1 AND type = 'credit' AND description ILIKE 'Free plan activation:%' 
       LIMIT 1`,
      [userId]
    );
    console.log('[claim-free-bundle] priorTx:', priorTx);
    if (priorTx.length) {
      return res.status(409).json({ message: 'Free plan already activated' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      console.log('[claim-free-bundle] SQL:', 'UPDATE users SET credits = COALESCE(credits,0) + $1 WHERE id = $2 RETURNING credits', [bundle.credits, userId]);
      const update = await client.query(
        'UPDATE users SET credits = COALESCE(credits,0) + $1 WHERE id = $2 RETURNING credits',
        [bundle.credits, userId]
      );
      console.log('[claim-free-bundle] update:', update.rows);
      const newCredits = update.rows[0].credits;

      console.log('[claim-free-bundle] SQL:', `INSERT INTO transactions (user_id, amount, type, description, created_at) VALUES ($1, $2, 'credit', $3, NOW())`, [userId, bundle.credits, `Free plan activation: ${bundle.name}`]);
      await client.query(
        `INSERT INTO transactions (user_id, amount, type, description, created_at)
         VALUES ($1, $2, 'credit', $3, NOW())`,
        [userId, bundle.credits, `Free plan activation: ${bundle.name}`]
      );

      // Ensure at least one active API key
      console.log('[claim-free-bundle] SQL:', 'SELECT id, key FROM api_keys WHERE user_id = $1 AND active = true LIMIT 1', [userId]);
      const { rows: keyRows } = await client.query(
        'SELECT id, key FROM api_keys WHERE user_id = $1 AND active = true LIMIT 1',
        [userId]
      );
      console.log('[claim-free-bundle] keyRows:', keyRows);
      let createdApiKey = null;
      if (keyRows.length === 0) {
        const key = `api_${userId}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
        console.log('[claim-free-bundle] SQL:', `INSERT INTO api_keys (user_id, key, name, active) VALUES ($1, $2, $3, $4) RETURNING *`, [userId, key, 'Default Key', true]);
        const ins = await client.query(
          `INSERT INTO api_keys (user_id, key, name, active) VALUES ($1, $2, $3, $4) RETURNING *`,
          [userId, key, 'Default Key', true]
        );
        console.log('[claim-free-bundle] ins:', ins.rows);
        createdApiKey = ins.rows[0];
      }

      await client.query('COMMIT');

      // Async Redis sync
      try {
        redisSyncService.updateCredits(userId, newCredits).catch(() => {});
        if (createdApiKey) {
          redisSyncService.registerApiKey({
            key: createdApiKey.key,
            user_id: createdApiKey.user_id,
            credits: newCredits,
            active: createdApiKey.active,
          }).catch(() => {});
        }
      } catch {}

      return res.status(200).json({
        success: true,
        credited: bundle.credits,
        newCredits,
        apiKeyCreated: !!createdApiKey,
        apiKey: createdApiKey ? createdApiKey.key : undefined,
      });
    } catch (e) {
      await client.query('ROLLBACK');
      console.error('Internal free bundle claim failed:', e);
      return res.status(500).json({ message: 'Failed to claim free plan' });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Internal claim free bundle error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});
// Claim a free bundle: credit user, record transaction, optionally create an API key
app.post('/api/claim-free-bundle', authenticateToken, async (req, res) => {
  try {
    const { bundleId } = req.body || {};
    if (!bundleId) return res.status(400).json({ message: 'bundleId is required' });

    // Load bundle and ensure it's free/active
    const { rows: bundleRows } = await pool.query(
      'SELECT id, name, description, credits, price FROM credit_bundles WHERE id = $1 AND active = true',
      [bundleId]
    );
    const bundle = bundleRows[0];
    if (!bundle) return res.status(404).json({ message: 'Bundle not found' });
    if ((bundle.price || 0) > 0) return res.status(400).json({ message: 'This bundle is not free' });

    const userId = req.user.id;

    // Prevent duplicate claiming: check prior free activation transaction
    const { rows: priorTx } = await pool.query(
      `SELECT id FROM transactions 
       WHERE user_id = $1 AND type = 'credit' AND description ILIKE 'Free plan activation:%' 
       LIMIT 1`,
      [userId]
    );
    if (priorTx.length) {
      return res.status(409).json({ message: 'Free plan already activated' });
    }

    // Credit user and insert transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const update = await client.query(
        'UPDATE users SET credits = COALESCE(credits,0) + $1 WHERE id = $2 RETURNING credits',
        [bundle.credits, userId]
      );
      const newCredits = update.rows[0].credits;

      await client.query(
        `INSERT INTO transactions (user_id, amount, type, description, created_at)
         VALUES ($1, $2, 'credit', $3, NOW())`,
        [userId, bundle.credits, `Free plan activation: ${bundle.name}`]
      );

      // Ensure the user has at least one API key
      const { rows: keyRows } = await client.query(
        'SELECT id, key FROM api_keys WHERE user_id = $1 AND active = true LIMIT 1',
        [userId]
      );
      let createdApiKey = null;
      if (keyRows.length === 0) {
        const key = `api_${userId}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
        const ins = await client.query(
          `INSERT INTO api_keys (user_id, key, name, active) VALUES ($1, $2, $3, $4) RETURNING *`,
          [userId, key, 'Default Key', true]
        );
        createdApiKey = ins.rows[0];
      }

      await client.query('COMMIT');

      // Sync credits/API key with Redis asynchronously
      try {
        redisSyncService.updateCredits(userId, newCredits).catch(() => {});
        if (createdApiKey) {
          redisSyncService.registerApiKey({
            key: createdApiKey.key,
            user_id: createdApiKey.user_id,
            credits: newCredits,
            active: createdApiKey.active,
          }).catch(() => {});
        }
      } catch {}

      return res.status(200).json({
        success: true,
        credited: bundle.credits,
        newCredits,
        apiKeyCreated: !!createdApiKey,
        apiKey: createdApiKey ? createdApiKey.key : undefined,
      });
    } catch (e) {
      await client.query('ROLLBACK');
      console.error('Free bundle claim failed:', e);
      return res.status(500).json({ message: 'Failed to claim free plan' });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Claim free bundle error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create Stripe Checkout Session for credits purchase (Test mode uses test API key)
app.post('/api/stripe/checkout-credits', authenticateToken, async (req, res) => {
  try {
    if (!stripe) {
      return res.status(500).json({ error: 'Stripe not configured. Missing STRIPE_SECRET_KEY.' });
    }
    const { bundleId } = req.body || {};
    if (!bundleId) return res.status(400).json({ error: 'bundleId is required' });

    // Get bundle info
    const { rows } = await pool.query(
      'SELECT id, name, description, credits, price FROM credit_bundles WHERE id = $1 AND active = true',
      [bundleId]
    );
    const bundle = rows[0];
    if (!bundle) return res.status(404).json({ error: 'Bundle not found' });

    // Determine base URL for post-checkout redirects
    // Prefer explicit env; else fall back to request origin; else localhost
    const reqOrigin = (() => {
      try {
        const proto = (req.headers['x-forwarded-proto'] || '').toString().split(',')[0] || (req.protocol || 'http');
        const host = (req.headers['x-forwarded-host'] || req.headers.host || '').toString().split(',')[0];
        return (host ? `${proto}://${host}` : '');
      } catch { return ''; }
    })();
    const appBaseUrl = process.env.APP_BASE_URL || reqOrigin || 'http://localhost:5000';
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

    console.log('[Stripe] Creating checkout session', {
      bundleId: bundle.id,
      name: bundle.name,
  rawPrice: bundle.price,
  normalizedDollars,
  computedUnitAmount: unitAmount
    });
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
        userId: String(req.user.id),
        bundleId: String(bundle.id),
        credits: String(bundle.credits),
      },
    });

  return res.status(200).json({ url: session.url, unitAmount, rawPrice: bundle.price, normalizedDollars });
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
          // Still acknowledge the webhook to avoid Stripe retries; set up monitoring if needed
        }
      }
    }

    return res.json({ received: true });
  } catch (err) {
    console.error('Stripe webhook handler error:', err);
    return res.status(500).json({ error: 'Internal webhook error' });
  }
});

// Public endpoint for credit bundles (no authentication required)
app.get('/api/credit-bundles', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM credit_bundles WHERE active = true ORDER BY credits ASC'
    );
    
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error fetching credit bundles:', error);
    res.status(500).json({ message: 'Server error', details: error.message });
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

// User endpoints
app.get('/api/me', authenticateToken, async (req, res) => {
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

app.patch('/api/profile', authenticateToken, async (req, res) => {
  try {
    const { email, company } = req.body;
    const updates = {};
    const params = [req.user.id];
    
    // Build dynamic update query
    let updateQuery = 'UPDATE users SET ';
    let paramIndex = 2;
    
    if (email) {
      updates.email = email;
      updateQuery += `email = $${paramIndex}, `;
      params.push(email);
      paramIndex++;
    }
    
    if (company !== undefined) {
      updates.company = company;
      updateQuery += `company = $${paramIndex}, `;
      params.push(company);
      paramIndex++;
    }
    
    // Remove trailing comma and space
    updateQuery = updateQuery.slice(0, -2);
    
    // Add WHERE clause and RETURNING
    updateQuery += ' WHERE id = $1 RETURNING id, first_name, last_name, email, company, credits, role';
    
    // If no updates, return current user
    if (Object.keys(updates).length === 0) {
      const result = await pool.query(
        'SELECT id, first_name, last_name, email, company, credits, role FROM users WHERE id = $1',
        [req.user.id]
      );
      
      const user = result.rows[0];
      return res.status(200).json({
        id: user.id,
        firstName: user.first_name,
        lastName: user.last_name,
        username: `${user.first_name} ${user.last_name}`,
        email: user.email,
        company: user.company,
        credits: user.credits,
        role: user.role
      });
    }
    
    // Perform update
    const result = await pool.query(updateQuery, params);
    
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
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// API Key endpoints
app.get('/api/api-keys', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM api_keys WHERE user_id = $1 AND active = true ORDER BY created_at DESC',
      [req.user.id]
    );
    
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Get API keys error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/api-keys', authenticateToken, async (req, res) => {
  try {
    const { name } = req.body;
    
    if (!name) {
      return res.status(400).json({ message: 'API key name is required' });
    }
    
    // Generate a unique API key
    const key = `api_${req.user.id}_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    
    // Insert new API key
    const result = await pool.query(
      `INSERT INTO api_keys (user_id, key, name, active) 
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [req.user.id, key, name, true]
    );
    
    const newApiKey = result.rows[0];
    
    // Get user's current credits for Redis sync
    const userResult = await pool.query(
      'SELECT credits FROM users WHERE id = $1',
      [req.user.id]
    );
    const userCredits = userResult.rows[0]?.credits || 0;

    // Sync with Redis (don't block response on sync failure)
    redisSyncService.registerApiKey({
      key: newApiKey.key,
      user_id: newApiKey.user_id,
      credits: userCredits,
      active: newApiKey.active
    }).then(syncResult => {
      if (syncResult.success) {
        console.log(`✅ API key ${newApiKey.key} synced to Redis`);
      } else {
        console.warn(`⚠️ Failed to sync API key to Redis: ${syncResult.message}`);
      }
    }).catch(error => {
      console.error('Redis sync error:', error);
    });
    
    res.status(201).json(newApiKey);
  } catch (error) {
    console.error('Create API key error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.delete('/api/api-keys/:id', authenticateToken, async (req, res) => {
  try {
    const keyId = req.params.id;
    
    // Verify the API key belongs to the user
    const keyCheck = await pool.query(
      'SELECT * FROM api_keys WHERE id = $1 AND user_id = $2',
      [keyId, req.user.id]
    );
    
    if (keyCheck.rows.length === 0) {
      return res.status(404).json({ message: 'API key not found' });
    }
    
    const apiKeyToDelete = keyCheck.rows[0];
    
    // Delete the API key permanently
    await pool.query(
      'DELETE FROM api_keys WHERE id = $1',
      [keyId]
    );
    
    // Sync deletion with Redis (don't block response on sync failure)
    redisSyncService.deleteApiKey(apiKeyToDelete.key).then(syncResult => {
      if (syncResult.success) {
        console.log(`✅ API key ${apiKeyToDelete.key} removed from Redis`);
      } else {
        console.warn(`⚠️ Failed to remove API key from Redis: ${syncResult.message}`);
      }
    }).catch(error => {
      console.error('Redis deletion sync error:', error);
    });
    
    res.status(200).json({ message: 'API key deleted successfully' });
  } catch (error) {
    console.error('Delete API key error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Credit and transaction endpoints
app.get('/api/credit-bundles', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM credit_bundles WHERE active = true ORDER BY credits ASC'
    );
    
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Get credit bundles error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/transactions', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM transactions WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    );
    
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// API usage analytics endpoint (for dashboard)
app.get('/api/api-usage', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM api_usage WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    );
    
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Get API usage error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// API usage endpoint (for FastAPI service)
app.post('/api/usage', authenticateServiceKey, async (req, res) => {
  try {
    const { apiKeyId, userId, queryComplexity, rowsProcessed, computeTimeMs, dataTransferredBytes } = req.body;
    
    // Validate required fields
    if (!apiKeyId || !userId) {
      return res.status(400).json({ message: 'API key ID and user ID are required' });
    }
    
    // Calculate credits to deduct based on the metrics
    let creditsToDeduct = 0;
    
    // Simple calculation based on complexity
    switch (queryComplexity) {
      case 'low':
        creditsToDeduct = 1;
        break;
      case 'medium':
        creditsToDeduct = 3;
        break;
      case 'high':
        creditsToDeduct = 5;
        break;
      case 'very_high':
        creditsToDeduct = 10;
        break;
      default:
        creditsToDeduct = 1;
    }
    
    // Additional factors
    if (rowsProcessed) {
      creditsToDeduct += Math.ceil(rowsProcessed / 10000);
    }
    
    if (computeTimeMs) {
      creditsToDeduct += Math.ceil(computeTimeMs / 5000);
    }
    
    if (dataTransferredBytes) {
      creditsToDeduct += Math.ceil(dataTransferredBytes / (1024 * 1024));
    }
    
    // Begin transaction
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Record API usage
      await client.query(
        `INSERT INTO api_usage (api_key_id, user_id, query_complexity, rows_processed, compute_time_ms, data_transferred_bytes, credits_used)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [apiKeyId, userId, queryComplexity, rowsProcessed, computeTimeMs, dataTransferredBytes, creditsToDeduct]
      );
      
      // Update user's credit balance
      const userResult = await client.query(
        'UPDATE users SET credits = credits - $1 WHERE id = $2 RETURNING credits',
        [creditsToDeduct, userId]
      );
      
      if (userResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ message: 'User not found' });
      }
      
      await client.query('COMMIT');
      
      const remainingCredits = userResult.rows[0].credits;
      
      // Sync updated credits with Redis (don't block response on sync failure)
      redisSyncService.updateCredits(userId, remainingCredits).then(syncResult => {
        if (syncResult.success) {
          console.log(`✅ Credits updated in Redis for user ${userId}: ${remainingCredits}`);
        } else {
          console.warn(`⚠️ Failed to update credits in Redis: ${syncResult.message}`);
        }
      }).catch(error => {
        console.error('Redis credit sync error:', error);
      });
      
      res.status(200).json({
        creditsDeducted: creditsToDeduct,
        remainingCredits: remainingCredits
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Record API usage error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Debug endpoint to verify API service key (remove after testing)
app.get('/api/debug/service-key', (req, res) => {
  const providedKey = req.headers['x-api-service-key'];
  const expectedKey = process.env.API_SERVICE_KEY;
  
  res.status(200).json({
    providedKey: providedKey || 'NOT_PROVIDED',
    expectedKeyLength: expectedKey ? expectedKey.length : 0,
    expectedKeyFirst3: expectedKey ? expectedKey.substring(0, 3) : 'NOT_SET',
    expectedKeyLast3: expectedKey ? expectedKey.substring(expectedKey.length - 3) : 'NOT_SET',
    match: providedKey === expectedKey
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ message: 'An unexpected error occurred' });
});

// Start the server
app.listen(port, () => {
  console.log(`API Gateway running on port ${port}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  pool.end();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  pool.end();
  process.exit(0);
});