const express = require('express');
const { pool } = require('../services/db');
const { authenticateToken, authorize } = require('../middleware/auth');
const { redisSyncService } = require('../services/redis');

const router = express.Router();

// --- Admin User Management Endpoints ---

// POST /api/admin/users/:id/credits
router.post('/users/:id/credits', authenticateToken, authorize(['business_admin', 'client_admin']), async (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);
    const { amount } = req.body;
    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({ message: 'Invalid credit amount' });
    }

    const { rows } = await pool.query(
      'UPDATE users SET credits = credits + $1 WHERE id = $2 RETURNING credits',
      [amount, userId]
    );

    if (rows.length === 0) return res.status(404).json({ message: 'User not found' });
    const newCreditTotal = rows[0].credits;
    
    // Asynchronously sync with Redis
    redisSyncService.updateCredits(userId, newCreditTotal).catch(console.error);

    res.status(200).json({ success: true, newBalance: newCreditTotal });
  } catch (error) {
    console.error('Admin add credits error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// PATCH /api/admin/users/:id/role
router.patch('/users/:id/role', authenticateToken, authorize(['business_admin']), async (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);
    const { role } = req.body;
    const validRoles = ['user', 'client_admin', 'business_admin'];
    if (!role || !validRoles.includes(role)) {
      return res.status(400).json({ message: 'Invalid role specified' });
    }

    await pool.query('UPDATE users SET role = $1 WHERE id = $2', [role, userId]);
    res.status(200).json({ success: true, message: 'User role updated.' });
  } catch (error) {
    console.error('Admin change role error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/admin/users/:id
router.delete('/users/:id', authenticateToken, authorize(['business_admin']), async (req, res) => {
    try {
        const userId = parseInt(req.params.id, 10);
        const AdminId = parseInt(req.user.id, 10);
        if (AdminId === userId) {
            return res.status(400).json({ message: "Admins cannot delete their own account." });
        }
        const keysResult = await pool.query('SELECT key FROM api_keys WHERE user_id = $1', [userId]);
        await pool.query('DELETE FROM users WHERE id = $1', [userId]);

        // Asynchronously remove their keys from Redis
        for (const apiKey of keysResult.rows) {
            redisSyncService.deleteApiKey(apiKey.key).catch(console.error);
        }
        res.status(200).json({ success: true, message: 'User deleted successfully.' });
    } catch (error) {
        console.error('Admin delete user error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

/**
 * GET /api/admin/statistics/charts
 * This is the new endpoint that will provide live data for the dashboard charts.
 */
router.get('/statistics/charts', authenticateToken, authorize(['business_admin', 'client_admin']), async (req, res) => {
  try {
    // Query for API usage over the last 7 days
    const dailyUsageQuery = `
      SELECT DATE_TRUNC('day', created_at)::date AS date, COUNT(id) AS requests
      FROM api_usage
      WHERE created_at >= NOW() - INTERVAL '7 days'
      GROUP BY 1 ORDER BY 1;
    `;
    
    // Query for revenue over the last 6 months
    const monthlyRevenueQuery = `
      SELECT TO_CHAR(created_at, 'YYYY-MM') AS month, SUM(amount) AS revenue
      FROM transactions
      WHERE type = 'purchase' AND created_at >= NOW() - INTERVAL '6 months'
      GROUP BY 1 ORDER BY 1;
    `;
    
    const [dailyUsageResult, monthlyRevenueResult] = await Promise.all([
      pool.query(dailyUsageQuery),
      pool.query(monthlyRevenueQuery)
    ]);
    
    // Format the data for the frontend charts
    const chartData = {
      usageByDayData: dailyUsageResult.rows.map(d => ({ name: new Date(d.date).toLocaleDateString('en-us', { weekday: 'short'}), requests: parseInt(d.requests, 10) })),
      revenueByMonthData: monthlyRevenueResult.rows.map(m => ({ name: new Date(`${m.month}-02`).toLocaleDateString('en-us', { month: 'short'}), revenue: parseInt(m.revenue || '0', 10) / 100 })),
    };

    res.status(200).json(chartData);
  } catch (error) {
    console.error("Error fetching admin chart data:", error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;