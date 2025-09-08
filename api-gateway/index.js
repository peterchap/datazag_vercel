require('./config/envLoader'); 

const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { pool } = require('./services/db');
const { corsOptions } = require('./config/cors');

const app = express();
const port = process.env.PORT || 3000;

// --- Middleware Configuration ---
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json({
  verify: (req, res, buf) => { req.rawBody = buf; }
}));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));

// --- Route Imports ---
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const adminRoutes = require('./routes/admin');
const stripeRoutes = require('./routes/stripe');
const publicRoutes = require('./routes/public');

// --- API Route Registration ---
app.use('/api', authRoutes);
app.use('/api', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/stripe', stripeRoutes);
app.use('/api', publicRoutes);

// Health check endpoint
app.get('/health', (req, res) => res.status(200).json({ status: 'ok' }));

// --- Error Handling and Server Start ---
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err);
  res.status(500).json({ message: 'An unexpected error occurred' });
});

app.listen(port, () => {
  console.log(`API Gateway running on port ${port}`);
});

// --- Graceful Shutdown ---
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  pool.end(() => process.exit(0));
});
process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  pool.end(() => process.exit(0));
});