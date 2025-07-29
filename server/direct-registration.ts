// Direct registration implementation that bypasses storage layer
import { Request, Response } from "express";
import { hash } from "bcrypt";
import { pool } from "./db";
import { USER_ROLES } from "@shared/schema";

// Hash a password with bcrypt
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 10;
  return await hash(password, saltRounds);
}

// Handle user registration directly with database
export async function handleDirectRegistration(req: Request, res: Response) {
  try {
    console.log("Direct registration request received:", {
      username: req.body.username,
      email: req.body.email,
      hasCompany: !!req.body.company,
      hasConfirmPassword: !!req.body.confirmPassword
    });

    // Check if email exists
    const checkEmailResult = await pool.query(
      `SELECT id FROM users WHERE email = $1`,
      [req.body.email]
    );

    if (checkEmailResult.rows && checkEmailResult.rows.length > 0) {
      console.log(`Registration failed: Email "${req.body.email}" already exists`);
      return res.status(400).json({ message: "Email already exists" });
    }

    // Hash password
    console.log("Hashing password...");
    const hashedPassword = await hashPassword(req.body.password);

    // Get first and last name from request
    const firstName = req.body.firstName || '';
    const lastName = req.body.lastName || '';
    // Also create a username combining both for backward compatibility
    const username = `${firstName} ${lastName}`.trim();
    console.log(`Creating user with first_name: "${firstName}", last_name: "${lastName}"`);
    
    // Default role and credits
    const role = req.body.role || USER_ROLES.USER;
    const credits = req.body.credits || 0;
    const company = req.body.company || '';

    // Direct database insert with both username and first_name/last_name
    console.log("Inserting user directly into database with parameterized query");
    const insertResult = await pool.query(
      `INSERT INTO users (username, first_name, last_name, email, password, company, role, credits) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
       RETURNING id, username, first_name, last_name, email, company, role, credits`,
      [username, firstName, lastName, req.body.email, hashedPassword, company, role, credits]
    );

    if (!insertResult.rows || insertResult.rows.length === 0) {
      throw new Error("User creation failed - no data returned");
    }

    const user = insertResult.rows[0];
    console.log(`User created successfully: ID=${user.id}, name=${user.username}`);

    // Return success without auto-login
    res.status(201).json({
      ...user,
      message: "Registration successful. You can now log in to your account."
    });
  } catch (error) {
    console.error("Registration failed with error:", error);
    res.status(500).json({
      message: "Registration failed",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
}