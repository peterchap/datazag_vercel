const express = require('express');
const { pool } = require('../services/db');
const { authenticateToken } = require('../middleware/auth');
const { Resend } = require('resend');
const { randomBytes } = require('crypto');
const bcrypt = require('bcryptjs');
const { redisSyncService } = require('../services/redis');
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const router = express.Router();

/**
 * GET /api/me
 * Fetches the profile for the currently authenticated user.
 */
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, first_name, last_name, email, company, credits, role FROM users WHERE id = $1',
      [req.user.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Transform to match the frontend's expected schema
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

/**
 * PATCH /api/profile
 * Updates the profile for the currently authenticated user.
 */
router.patch('/profile', authenticateToken, async (req, res) => {
  try {
    const { firstName, lastName, company } = req.body;
    
    // Build the update query dynamically to only update provided fields
    const fields = [];
    const values = [];
    let query = 'UPDATE users SET ';
    
    if (firstName) { fields.push('first_name = $' + (values.length + 1)); values.push(firstName); }
    if (lastName) { fields.push('last_name = $' + (values.length + 1)); values.push(lastName); }
    if (company !== undefined) { fields.push('company = $' + (values.length + 1)); values.push(company); }

    if (fields.length === 0) {
        return res.status(400).json({ message: 'No fields to update.' });
    }

    query += fields.join(', ');
    query += ` WHERE id = $${values.length + 1} RETURNING *`;
    values.push(req.user.id);
    
    await pool.query(query, values);
    
    res.status(200).json({ message: 'Profile updated successfully.' });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});


/**
 * GET /api/api-keys
 * Fetches all API keys for the currently authenticated user.
 */
router.get('/api-keys', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, name, key, active, created_at FROM api_keys WHERE user_id = $1 ORDER BY created_at DESC',
            [req.user.id]
        );
        // Mask the keys before sending to the client
        const maskedKeys = result.rows.map(row => ({
            ...row,
            key: `datazag...${row.key.slice(-8)}`
        }));
        res.status(200).json(maskedKeys);
    } catch (error) {
        console.error('Get API keys error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

/**
 * POST /api-keys
 * Creates a new API key for the currently authenticated user.
 */
router.post('/api-keys', authenticateToken, async (req, res) => {
  try {
    console.log("[POST /api-keys] Handler started."); // Log 1: Entry point
    
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ message: 'API key name is required' });
    }
    
    const key = `datazag_${require('crypto').randomBytes(16).toString('hex')}`;
    
    // 1. Insert the new key into the PostgreSQL database.
    const { rows } = await pool.query(
      `INSERT INTO api_keys (user_id, key, name, active) VALUES ($1, $2, $3, true) RETURNING *`,
      [req.user.id, key, name]
    );
    
    const newApiKey = rows[0];
    console.log("[POST /api-keys] DB Insert successful. New key ID:", newApiKey.id); // Log 2: After DB insert

    // 2. Perform the Redis sync and wait for it to complete.
    const userResult = await pool.query('SELECT credits FROM users WHERE id = $1', [req.user.id]);
    console.log("[POST /api-keys] Fetched user credits from DB."); // Log 3: After fetching credits
    
    // Check if the user was found before trying to access credits
    if (!userResult.rows[0]) {
        console.error(`[POST /api-keys] CRITICAL ERROR: Could not find user with ID ${req.user.id} to fetch credits.`);
        // Even if we can't sync, we should still let the user know their key was created.
        return res.status(201).json(newApiKey); 
    }
    const userCredits = userResult.rows[0].credits || 0;

    console.log(`[Redis Sync] Attempting to register key ${newApiKey.key} for user ${req.user.id}...`);

    const syncResult = await redisSyncService.registerApiKey({
      key: newApiKey.key,
      user_id: newApiKey.user_id,
      credits: userCredits,
      active: newApiKey.active
    });

    if (syncResult.success) {
      console.log(`✅ [Redis Sync] Successfully registered key ${newApiKey.key}. Response:`, syncResult.data);
    } else {
      console.error(`❌ [Redis Sync] Failed to register key ${newApiKey.key}. Reason:`, syncResult.message);
    }

    // 3. Now that all backend operations are complete, send the successful response.
    res.status(201).json(newApiKey);

  } catch (error) {
    console.error('Create API key error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * DELETE /api/api-keys/:id
 * Deletes an API key for the currently authenticated user.
 */
router.delete('/api-keys/:id', authenticateToken, async (req, res) => {
    // ... (Full logic for deleting an API key from your index.js)
});


/**
 * GET /api/transactions
 * Fetches the transaction history for the currently authenticated user.
 */
router.get('/transactions', authenticateToken, async (req, res) => {
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

/**
 * GET /api/api-usage
 * Fetches the API usage analytics for the currently authenticated user.
 */
router.get('/api-usage', authenticateToken, async (req, res) => {
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

/**
 * POST /api/requests
 * Creates a new support/admin request for the currently authenticated user.
 */
router.post('/requests', authenticateToken, async (req, res) => {
  try {
    const { category, subject, description } = req.body;
    if (!category || !subject || !description) {
      return res.status(400).json({ message: 'Category, subject, and description are required.' });
    }

    // Insert the new request into the database, linked to the authenticated user.
    const { rows } = await pool.query(
      `INSERT INTO admin_requests (user_id, category, subject, description, status) 
       VALUES ($1, $2, $3, $4, 'Open') RETURNING *`,
      [req.user.id, category, subject, description]
    );
    
    const newRequest = rows[0];

    // --- New: Send email notification to support ---
    if (resend) {
      // Fetch the user's email for the notification
      const userResult = await pool.query('SELECT email FROM users WHERE id = $1', [req.user.id]);
      const userEmail = userResult.rows[0]?.email || 'Unknown';

      // Send the email in the background (fire-and-forget)
      resend.emails.send({
        from: process.env.EMAIL_FROM || 'noreply@datazag.com',
        to: 'support@datazag.com',
        subject: `New Customer Request [${category}]: ${subject}`,
        html: `
          <h1>New Customer Support Request</h1>
          <p>A new request has been submitted through the customer portal.</p>
          <ul>
            <li><strong>User ID:</strong> ${req.user.id}</li>
            <li><strong>User Email:</strong> ${userEmail}</li>
            <li><strong>Category:</strong> ${category}</li>
            <li><strong>Subject:</strong> ${subject}</li>
          </ul>
          <hr>
          <h3>Description:</h3>
          <p>${description}</p>
        `
      }).catch(err => {
        // Log any email sending errors, but don't let it fail the user's request
        console.error("Failed to send support notification email:", err);
      });
    }
    // --- End of new logic ---

    res.status(201).json(newRequest);
  } catch (error) {
    console.error('Error creating admin request:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * POST /api/requests/:id/comments
 * Adds a new comment from a user to an existing support request.
 */
router.post('/requests/:id/comments', authenticateToken, async (req, res) => {
  try {
    const requestId = parseInt(req.params.id, 10);
    const { comment } = req.body;
    if (!comment) {
      return res.status(400).json({ message: 'Comment text is required.' });
    }

    // First, verify that the request belongs to the authenticated user for security
    const requestCheck = await pool.query('SELECT * FROM admin_requests WHERE id = $1 AND user_id = $2', [requestId, req.user.id]);
    if (requestCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Request not found or you do not have permission to comment on it.' });
    }
    
    // Insert the new comment into the database
    const { rows } = await pool.query(
      `INSERT INTO request_comments (request_id, user_id, author_type, comment) 
       VALUES ($1, $2, 'user', $3) RETURNING *`,
      [requestId, req.user.id, comment]
    );
    
    // Notify support that a customer has replied to a ticket
    if (resend) {
      const userResult = await pool.query('SELECT email FROM users WHERE id = $1', [req.user.id]);
      resend.emails.send({
        from: process.env.EMAIL_FROM || 'noreply@datazag.com',
        to: 'support@datazag.com',
        subject: `New Customer Comment on Request #${requestId}`,
        html: `A customer has added a new comment to a support request.<p><strong>From:</strong> ${userResult.rows[0]?.email}</p><p><strong>Comment:</strong> ${comment}</p>`,
      }).catch(console.error);
    }

    res.status(201).json(rows[0]);
  } catch (error) {
    console.error('Error adding comment to request:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * POST /api/requests
 * Creates a new support/admin request for the currently authenticated user
 * and sends an email notification to the support team.
 */
router.post('/requests', authenticateToken, async (req, res) => {
  try {
    const { category, subject, description } = req.body;
    if (!category || !subject || !description) {
      return res.status(400).json({ message: 'Category, subject, and description are required.' });
    }

    // 1. Insert the new request into the database.
    const { rows } = await pool.query(
      `INSERT INTO admin_requests (user_id, category, subject, description, status) 
       VALUES ($1, $2, $3, $4, 'Open') RETURNING *`,
      [req.user.id, category, subject, description]
    );
    
    const newRequest = rows[0];

    // 2. Send an email notification to your support team.
    if (resend) {
      // Fetch the user's email for the notification
      const userResult = await pool.query('SELECT email FROM users WHERE id = $1', [req.user.id]);
      const userEmail = userResult.rows[0]?.email || 'Unknown';

      // Send the email in the background (fire-and-forget)
      resend.emails.send({
        from: process.env.EMAIL_FROM || 'noreply@datazag.com',
        to: 'support@datazag.com',
        subject: `New Customer Request [${category}]: ${subject}`,
        html: `
          <h1>New Customer Support Request</h1>
          <p>A new request has been submitted through the customer portal.</p>
          <ul>
            <li><strong>User ID:</strong> ${req.user.id}</li>
            <li><strong>User Email:</strong> ${userEmail}</li>
            <li><strong>Category:</strong> ${category}</li>
            <li><strong>Subject:</strong> ${subject}</li>
          </ul>
          <hr>
          <h3>Description:</h3>
          <p>${description.replace(/\n/g, '<br>')}</p>
        `
      }).catch(err => {
        // Log any email sending errors, but don't let it fail the user's request
        console.error("Failed to send support notification email:", err);
      });
    }

    // 3. Send a success response back to the Next.js app.
    res.status(201).json(newRequest);
    
  } catch (error) {
    console.error('Error creating admin request:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * POST /api/request-email-change
 * This is the new, fully functional endpoint. It creates a verification
 * token and sends a confirmation email to the new address.
 */
router.post('/request-email-change', authenticateToken, async (req, res) => {
    try {
        const { newEmail } = req.body;
        if (!newEmail || typeof newEmail !== 'string') {
            return res.status(400).json({ message: 'A valid new email address is required.' });
        }

        // Generate a secure, unique token for this specific email change request
        const verificationToken = randomBytes(32).toString('hex');
        const tokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour expiry

        // Store the token and the new email address in your verification table.
        // We are repurposing the 'email_verification_tokens' table for this.
        // In a larger app, you might create a dedicated 'email_changes' table.
        await pool.query(
            'INSERT INTO email_verification_tokens (user_id, token, expires_at, metadata) VALUES ($1, $2, $3, $4)',
            [req.user.id, verificationToken, tokenExpiry, { newEmail: newEmail, type: 'email_change' }]
        );

        const verificationUrl = `${process.env.APP_BASE_URL || 'http://localhost:3001'}/api/verify-email-change/${verificationToken}`;
      
        if (resend) {
            resend.emails.send({
                from: process.env.EMAIL_FROM || 'noreply@datazag.com',
                to: newEmail, // Send the email to the NEW address for verification
                subject: 'Confirm Your New Email Address for Datazag',
                html: `<h1>Confirm Your Email Change</h1><p>Please click the link below to confirm the change of your email address for your Datazag account.</p><a href="${verificationUrl}">Confirm New Email</a><p>This link will expire in one hour. If you did not request this change, you can safely ignore this email.</p>`,
            }).catch(console.error);
        }

        res.status(200).json({ message: `A verification email has been sent to ${newEmail}. Please click the link to confirm.` });

    } catch (error) {
        console.error('Request email change error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

/**
 * POST /api/recovery-codes/generate
 * Generates a new set of recovery codes for the authenticated user.
 */
router.post('/recovery-codes/generate', authenticateToken, async (req, res) => {
  try {
    const plainTextCodes = Array.from({ length: 10 }, () => 
      `${randomBytes(2).toString('hex').toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`
    );

    const hashedCodes = await Promise.all(
      plainTextCodes.map(code => bcrypt.hash(code, 10))
    );
    
    await pool.query(
      'UPDATE users SET recovery_codes = $1 WHERE id = $2',
      [JSON.stringify(hashedCodes), req.user.id]
    );
    
    // This is the fix: The response key is now 'codes' to match the frontend.
    res.status(200).json({ codes: plainTextCodes });

  } catch (error) {
    console.error('Error generating recovery codes:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * GET /api/recovery-codes/count
 * This is the new endpoint that was missing. It returns the number of
 * available recovery codes for the authenticated user.
 */
router.get('/recovery-codes/count', authenticateToken, async (req, res) => {
    try {
        const { rows } = await pool.query(
            'SELECT recovery_codes FROM users WHERE id = $1',
            [req.user.id]
        );
        if (rows.length === 0) {
            return res.status(404).json({ count: 0 });
        }
        const codes = rows[0].recovery_codes;
        const count = Array.isArray(codes) ? codes.length : 0;
        res.status(200).json({ count });
    } catch (error) {
        console.error('Error counting recovery codes:', error);
        res.status(500).json({ message: 'Server error' });
    }
});


module.exports = router;