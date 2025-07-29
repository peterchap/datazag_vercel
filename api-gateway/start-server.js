/**
 * API Gateway Server Launcher
 * 
 * This script starts the API Gateway in production mode with proper error handling
 * and can be used with process managers like PM2.
 */

// Load environment variables from .env file
require('dotenv').config();

// Import the server setup
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');

// Basic validation
if (!process.env.DATABASE_URL) {
  console.error('Missing DATABASE_URL environment variable');
  process.exit(1);
}

if (!process.env.JWT_SECRET) {
  console.error('Missing JWT_SECRET environment variable');
  process.exit(1);
}

if (!process.env.API_SERVICE_KEY) {
  console.error('Missing API_SERVICE_KEY environment variable');
  process.exit(1);
}

// Initialize Express app
const app = express();
const port = process.env.PORT || 3000;

// Configure middleware
app.use(express.json());

// Configure CORS
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',') 
  : ['http://localhost:5000'];

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
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DB_USE_SSL === 'false' ? false : { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000,
  max: 10,
  idleTimeoutMillis: 30000
});

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

// Health check endpoint - accessible without authentication
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
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