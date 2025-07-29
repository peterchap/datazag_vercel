// Direct login implementation that bypasses storage layer
import { Request, Response } from "express";
import { compare } from "bcrypt";
import { pool } from "./db";

// Directly verify a password against the hashed version in database
export async function verifyPassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
  return await compare(plainPassword, hashedPassword);
}

// Handle user login directly with database
export async function handleDirectLogin(req: Request, res: Response) {
  try {
    const emailOrUsername = req.body.email;
    console.log(`Direct login request received for email/username: ${emailOrUsername}`);

    // First try to find by email
    let userResult = await pool.query(
      `SELECT id, username, first_name as "firstName", last_name as "lastName", 
        email, password, company, role, credits, 
        stripe_customer_id as "stripeCustomerId",
        can_purchase_credits as "canPurchaseCredits",
        credit_threshold as "creditThreshold"
       FROM users WHERE email = $1`,
      [emailOrUsername]
    );

    // If no user found by email, try by username
    if (!userResult.rows || userResult.rows.length === 0) {
      console.log(`User not found by email, trying username: ${emailOrUsername}`);
      userResult = await pool.query(
        `SELECT id, username, first_name as "firstName", last_name as "lastName", 
          email, password, company, role, credits, 
          stripe_customer_id as "stripeCustomerId",
          can_purchase_credits as "canPurchaseCredits",
          credit_threshold as "creditThreshold"
         FROM users WHERE username ILIKE $1 OR username = $1`,
        [`%${emailOrUsername}%`]
      );
    }
    
    // If still no user found
    if (!userResult.rows || userResult.rows.length === 0) {
      console.log(`Login failed: User with email/username "${emailOrUsername}" not found`);
      return res.status(401).json({ message: "Invalid email/username or password" });
    }

    const user = userResult.rows[0];
    
    // Verify password
    const isPasswordValid = await verifyPassword(req.body.password, user.password);
    
    if (!isPasswordValid) {
      console.log(`Login failed: Invalid password for user ${user.id}`);
      return res.status(401).json({ message: "Invalid email or password" });
    }

    console.log(`User logged in successfully: ID=${user.id}, name=${user.first_name} ${user.last_name}`);

    // Create a logged-in session
    req.login(user, (err) => {
      if (err) {
        console.error("Session login error:", err);
        return res.status(500).json({ 
          message: "Login succeeded but session creation failed",
          error: err.message 
        });
      }

      // Return success with user info (excluding sensitive fields)
      const { password, ...safeUserData } = user;
      res.status(200).json(safeUserData);
    });
  } catch (error) {
    console.error("Login failed with error:", error);
    res.status(500).json({
      message: "Login failed",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
}