const express = require('express');
const { pool } = require('../services/db');

const router = express.Router();

/**
 * GET /api/credit-bundles
 * Fetches a list of all active credit bundles.
 * This is a public endpoint and does not require authentication, so it can be
 * used on a public pricing page.
 */
router.get('/credit-bundles', async (req, res) => {
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

module.exports = router;