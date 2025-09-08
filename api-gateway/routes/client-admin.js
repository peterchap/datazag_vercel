const express = require('express');
const { pool } = require('../services/db');
const { authenticateToken, authorize } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/client-admin/company-users
 * Fetches a list of all users belonging to the same company as the client admin.
 */
router.get('/company-users', authenticateToken, authorize(['client_admin']), async (req, res) => {
    try {
        // First, get the client admin's company name
        const adminUserResult = await pool.query('SELECT company FROM users WHERE id = $1', [req.user.id]);
        const companyName = adminUserResult.rows[0]?.company;

        if (!companyName) {
            return res.status(400).json({ message: "Admin's company not found." });
        }

        // Then, fetch all users from that same company
        const { rows } = await pool.query(
            'SELECT id, first_name, last_name, email, role, credits, can_purchase_credits FROM users WHERE company = $1 ORDER BY first_name',
            [companyName]
        );
        
        res.status(200).json(rows);
    } catch (error) {
        console.error('Error fetching company users:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

/**
 * PATCH /api/client-admin/users/:userId/permissions
 * Allows a client admin to update the 'canPurchaseCredits' status for a user in their company.
 */
router.patch('/users/:userId/permissions', authenticateToken, authorize(['client_admin']), async (req, res) => {
    try {
        const { canPurchaseCredits } = req.body;
        const userIdToUpdate = parseInt(req.params.userId, 10);

        // Security check: Ensure the user being updated belongs to the admin's company
        const adminCompanyResult = await pool.query('SELECT company FROM users WHERE id = $1', [req.user.id]);
        const targetUserCompanyResult = await pool.query('SELECT company FROM users WHERE id = $1', [userIdToUpdate]);

        if (adminCompanyResult.rows[0]?.company !== targetUserCompanyResult.rows[0]?.company) {
            return res.status(403).json({ message: "Forbidden: You can only manage users within your own company." });
        }
        
        await pool.query(
            'UPDATE users SET can_purchase_credits = $1 WHERE id = $2',
            [!!canPurchaseCredits, userIdToUpdate]
        );
        
        res.status(200).json({ success: true, message: 'User permissions updated.' });
    } catch (error) {
        console.error('Error updating user permissions:', error);
        res.status(500).json({ message: 'Server error' });
    }
});


module.exports = router;