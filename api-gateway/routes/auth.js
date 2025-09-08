const express = require('express');
const { pool } = require('../services/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Resend } = require('resend');
const { randomBytes } = require('crypto');

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const router = express.Router();

// POST /api/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }
    
    const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = rows[0];
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    
    const tokenPayload = {
      sub: user.id, // 'sub' is the standard JWT claim for the user's ID
      role: user.role, // The role is taken directly from the database record
      email: user.email,
    };
    
    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: '2d' });
    
    const { password: _, ...userWithoutPassword } = user;
    res.status(200).json({ token, user: userWithoutPassword });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * POST /api/register
 * This is the updated, more robust registration endpoint.
 */
router.post('/register', async (req, res) => {
  try {
    // It now accepts 'website' from the request body.
    const { firstName, lastName, email, password, company, website } = req.body;
    
    if (!firstName || !lastName || !email || !password || !company) {
      return res.status(400).json({ message: 'First name, last name, email, password, and company are required.' });
    }
    // You can add more robust password validation here to match the frontend.
    if (password.length < 8) {
        return res.status(400).json({ message: 'Password must be at least 8 characters.' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 12);
    const verificationToken = randomBytes(32).toString('hex');
    const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
    
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // The SQL query now includes the new 'website' field.
      const result = await client.query(
        `INSERT INTO users (first_name, last_name, email, password, company, website, email_verified) 
         VALUES ($1, $2, $3, $4, $5, $6, false) RETURNING *`,
        [firstName, lastName, email, hashedPassword, company, website || null]
      );
      
      const newUser = result.rows[0];
      
      await client.query(
        'INSERT INTO email_verification_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
        [newUser.id, verificationToken, tokenExpiry]
      );
      
      await client.query('COMMIT');
      
      res.status(201).json({
        message: 'Registration successful. Please check your email to verify your account.',
        userId: newUser.id
      });
      
      if (resend) {
        const verificationUrl = `${process.env.APP_BASE_URL || 'http://localhost:3001'}/api/verify-email/${verificationToken}`;
        resend.emails.send({
          from: process.env.EMAIL_FROM || 'noreply@datazag.com',
          to: email,
          subject: 'Verify your email address - Datazag',
          html: `<h1>Welcome, ${firstName}!</h1><p>Please click the link below to verify your email address:</p><a href="${verificationUrl}">Verify Email</a>`,
        }).catch(err => console.error("Failed to send verification email:", err));
      }
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('Registration error:', error);
    if (error.code === '23505') {
        return res.status(409).json({ message: 'An account with this email already exists.' });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * POST /api/oauth-register
 * Handles user creation/update from an OAuth provider (e.g., Google, GitHub).
 */
router.post('/oauth-register', async (req, res) => {
    // This is the full logic from your original index.js file, now in its correct home.
    try {
        const { email, name, provider, providerId } = req.body;
        if (!email || !name || !provider || !providerId) {
            return res.status(400).json({ message: 'Missing required fields' });
        }
        
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const userResult = await client.query('SELECT * FROM users WHERE email = $1', [email]);
            let userId;
            if (userResult.rows.length === 0) {
                const [firstName, ...lastNameParts] = name.split(' ');
                const lastName = lastNameParts.join(' ');
                const columnName = provider === 'google' ? 'google_id' : 'github_id';
                const placeholderPassword = await bcrypt.hash('oauth-' + Date.now(), 12);
                
                const newUserResult = await client.query(
                    `INSERT INTO users (first_name, last_name, email, password, company, role, credits, email_verified, ${columnName}) 
                     VALUES ($1, $2, $3, $4, $5, 'user', 0, true, $6) RETURNING id`,
                    [firstName || name, lastName || '', email, placeholderPassword, '', providerId]
                );
                userId = newUserResult.rows[0].id;
            } else {
                const columnName = provider === 'google' ? 'google_id' : 'github_id';
                await client.query(`UPDATE users SET ${columnName} = $1 WHERE id = $2`, [providerId, userResult.rows[0].id]);
                userId = userResult.rows[0].id;
            }
            await client.query('COMMIT');
            res.json({ success: true, userId });
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('OAuth registration error:', error);
        res.status(500).json({ message: 'Registration failed' });
    }
});

/**
 * POST /api/check-email
 * Checks if an email is already registered.
 */
router.post('/check-email', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }
    const result = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    res.json({ available: result.rows.length === 0 });
  } catch (error) {
    console.error('Email check error:', error);
    res.status(500).json({ available: null });
  }
});

/**
 * GET /api/verify-email/:token
 * This is the updated endpoint. It now returns a JSON response instead of a redirect.
 */
router.get('/verify-email/:token', async (req, res) => {
    const { token } = req.params;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const result = await client.query(
            'SELECT * FROM email_verification_tokens WHERE token = $1 AND used = false AND expires_at > NOW()',
            [token]
        );
        if (result.rows.length === 0) {
            throw new Error('Invalid or expired token');
        }
        
        const verificationToken = result.rows[0];
        await client.query('UPDATE users SET email_verified = true WHERE id = $1', [verificationToken.user_id]);
        await client.query('UPDATE email_verification_tokens SET used = true WHERE token = $1', [token]);
        
        await client.query('COMMIT');
        
        // Return a success message instead of a redirect
        res.status(200).json({ success: true, message: 'Email verified successfully.' });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Verification error:', error);
        // Return an error message
        res.status(400).json({ success: false, error: error.message || 'Verification failed.' });
    } finally {
        client.release();
    }
});
/**
 * POST /api/forgot-password
 * Generates a password reset token and emails a reset link to the user.
 */
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required.' });

    const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = rows[0];

    if (user) {
      // User found, proceed with generating token and sending email
      const resetToken = randomBytes(32).toString('hex');
      const tokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour expiry

      await pool.query(
        'UPDATE users SET password_reset_token = $1, password_reset_expires = $2 WHERE id = $3',
        [resetToken, tokenExpiry, user.id]
      );
      
      const resetUrl = `${process.env.APP_BASE_URL || 'http://localhost:3001'}/reset-password?token=${resetToken}`;
      
      if (resend) {
        resend.emails.send({
            from: process.env.EMAIL_FROM || 'noreply@datazag.com',
            to: user.email,
            subject: 'Your Password Reset Request',
            html: `<h1>Password Reset</h1><p>You requested a password reset. Click the link below to set a new password:</p><a href="${resetUrl}">Reset Password</a><p>This link will expire in one hour.</p>`,
        }).catch(console.error);
      }
    }
    
    // For security, always return a success message, even if the user was not found, to prevent email enumeration attacks.
    res.status(200).json({ message: 'If an account with that email exists, a password reset link has been sent.' });

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * POST /api/reset-password
 * Resets a user's password using a valid token.
 */
router.post('/reset-password', async (req, res) => {
    try {
        const { token, password } = req.body;
        if (!token || !password) {
            return res.status(400).json({ message: 'Token and new password are required.' });
        }
        if (password.length < 8) {
            return res.status(400).json({ message: 'Password must be at least 8 characters.'});
        }

        // Find user with a valid, non-expired token
        const { rows } = await pool.query(
            'SELECT * FROM users WHERE password_reset_token = $1 AND password_reset_expires > NOW()',
            [token]
        );
        const user = rows[0];
        if (!user) {
            return res.status(400).json({ message: 'Invalid or expired password reset token.' });
        }
        
        const hashedPassword = await bcrypt.hash(password, 12);

        // Update password and clear the reset token to ensure it's single-use
        await pool.query(
            'UPDATE users SET password = $1, password_reset_token = NULL, password_reset_expires = NULL WHERE id = $2',
            [hashedPassword, user.id]
        );

        res.status(200).json({ message: 'Password has been reset successfully. You can now log in.' });

    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

/**
 * GET /api/verify-email-change/:token
 * This is the new endpoint that handles the verification link from the email.
 */
router.get('/verify-email-change/:token', async (req, res) => {
  const { token } = req.params;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Find a valid, non-expired token for an email change
    const tokenResult = await client.query(
      `SELECT * FROM email_verification_tokens 
       WHERE token = $1 AND used = false AND expires_at > NOW() AND metadata->>'type' = 'email_change'`,
      [token]
    );

    if (tokenResult.rows.length === 0) {
      throw new Error('Invalid or expired verification token.');
    }

    const verification = tokenResult.rows[0];
    const newEmail = verification.metadata.newEmail;
    const userId = verification.user_id;

    // 2. Update the user's email address in the main users table
    await client.query('UPDATE users SET email = $1 WHERE id = $2', [newEmail, userId]);

    // 3. Mark the token as used to prevent it from being used again
    await client.query('UPDATE email_verification_tokens SET used = true WHERE id = $1', [verification.id]);

    await client.query('COMMIT');

    // 4. Return a success message
    res.status(200).json({ success: true, message: 'Email address has been successfully updated.' });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Email change verification error:', error);
    res.status(400).json({ success: false, error: error.message || 'Verification failed.' });
  } finally {
    client.release();
  }
});

module.exports = router;