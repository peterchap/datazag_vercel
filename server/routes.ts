import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage as dbStorage } from "./storage";
import passport from "passport";
import Stripe from "stripe";
import multer from "multer";
import path from "path";
import fs from "fs";
import { setupAuth } from "./auth";

import {
  insertApiKeySchema,
  insertTransactionSchema,
  insertApiUsageSchema,
  User,
  USER_ROLES,
  apiKeys,
  users
} from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";
import { createPaypalOrder, capturePaypalOrder, loadPaypalDefault } from "./paypal";
import { z } from "zod";
import { notificationService } from "./notifications";
import { integrationService } from "./integration-service";
import { githubConfig } from "./oauth-config";



declare global {
  namespace Express {
    interface User {
      id: number;
      username: string;
      email: string;
      role: string;
      company?: string;
      active: boolean;
      credits: number;
      canPurchaseCredits: boolean;
      creditThreshold?: number;
      gracePeriodDays?: number;
    }
  }
}

// Initialize Stripe if key is available
const stripeApiKey = process.env.STRIPE_SECRET_KEY || '';
const stripe = stripeApiKey 
  ? new Stripe(stripeApiKey, { apiVersion: "2025-04-30.basil" })
  : undefined;

export async function registerRoutes(app: Express): Promise<Server> {
  // Add route debugging middleware FIRST
  app.use('/auth', (req, res, next) => {
    console.log(`AUTH ROUTE HIT: ${req.method} ${req.path} from ${req.get('host')}`);
    next();
  });

  // CRITICAL: Set up authentication and sessions FIRST before any routes
  setupAuth(app);
  

  
  // Set up file upload directory
  const uploadDir = path.join(process.cwd(), 'uploads');
  
  // Create the uploads directory if it doesn't exist
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  
  // Configure multer storage for file uploads
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      // Generate a unique filename with the original extension
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const ext = path.extname(file.originalname);
      cb(null, file.fieldname + '-' + uniqueSuffix + ext);
    }
  });
  
  // Define file upload limits
  const upload = multer({ 
    storage: storage,
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB limit
    }
  });

  // Authentication middleware
  function isAuthenticated(req: Request, res: Response, next: NextFunction) {
    if (req.isAuthenticated()) {
      return next();
    }
    res.status(401).json({ message: "Authentication required" });
  }

  function isAdmin(req: Request, res: Response, next: NextFunction) {
    if (req.isAuthenticated() && req.user && (req.user.role === USER_ROLES.BUSINESS_ADMIN || req.user.role === USER_ROLES.CLIENT_ADMIN)) {
      return next();
    }
    res.status(403).json({ message: "Admin access required" });
  }

  function isClientAdmin(req: Request, res: Response, next: NextFunction) {
    if (req.isAuthenticated() && req.user && req.user.role === USER_ROLES.CLIENT_ADMIN) {
      return next();
    }
    res.status(403).json({ message: "Client admin access required" });
  }

  function isBusinessAdmin(req: Request, res: Response, next: NextFunction) {
    if (req.isAuthenticated() && req.user && req.user.role === USER_ROLES.BUSINESS_ADMIN) {
      return next();
    }
    res.status(403).json({ message: "Business admin access required" });
  }

  // OAuth Routes
  app.get("/auth/github", (req, res, next) => {
    console.log('GitHub OAuth initiated, callback URL:', githubConfig.callbackURL);
    passport.authenticate("github", { scope: ["user:email"] })(req, res, next);
  });
  app.get("/auth/github/callback", 
    passport.authenticate("github", { failureRedirect: "/auth?error=github_failed" }),
    (req, res) => {
      console.log('GitHub OAuth callback success, redirecting to dashboard');
      res.redirect("/dashboard");
    }
  );
  
  app.get("/auth/google", passport.authenticate("google", { scope: ["profile", "email"] }));
  app.get("/auth/google/callback",
    passport.authenticate("google", { failureRedirect: "/auth?error=google_failed" }),
    (req, res) => {
      console.log('Google OAuth callback success, redirecting to dashboard');
      res.redirect("/dashboard");
    }
  );
  
  // Test route to verify auth routing works
  app.get("/auth/test", (req, res) => {
    console.log('Auth test route hit successfully');
    res.json({ 
      message: 'Auth routing is working',
      timestamp: new Date().toISOString()
    });
  });

  // Direct Microsoft OAuth test route
  app.get("/auth/microsoft-test", (req, res) => {
    console.log('Microsoft test route hit');
    console.log('Available strategies:', Object.keys(passport._strategies || {}));
    res.json({ 
      message: 'Microsoft test route working',
      strategies: Object.keys(passport._strategies || {}),
      microsoftExists: !!passport._strategies?.microsoft
    });
  });

  // Test route to verify API routing
  app.get("/api/test", (req, res) => {
    console.log('API test route hit successfully');
    res.json({ message: 'API routing works', timestamp: new Date().toISOString() });
  });

  // Microsoft OAuth redirect route
  app.get("/api/microsoft-oauth", (req, res) => {
    console.log('Microsoft OAuth route hit - redirecting to Microsoft');
    
    const clientId = "5a37b8fb-0633-4e82-9b2b-ca4b8ecc8f1e";
    const callbackUrl = encodeURIComponent('https://client.datazag.com/auth/microsoft/callback');
    const scope = encodeURIComponent('openid profile email User.Read');
    const state = Math.random().toString(36).substring(7);
    
    const authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?` +
      `client_id=${clientId}&` +
      `response_type=code&` +
      `redirect_uri=${callbackUrl}&` +
      `scope=${scope}&` +
      `state=${state}&` +
      `response_mode=query`;
    
    console.log('Microsoft OAuth URL:', authUrl);
    res.redirect(authUrl);
  });

  app.get("/auth/microsoft", (req, res, next) => {
    console.log('=== MICROSOFT OAUTH ROUTE HANDLER ===');
    console.log('Available strategies:', Object.keys(passport._strategies || {}));
    
    if (!passport._strategies?.microsoft) {
      console.error('Microsoft strategy not found, redirecting to error page');
      return res.redirect('/auth?error=microsoft_not_configured');
    }
    
    console.log('Using Microsoft passport strategy');
    passport.authenticate("microsoft", { 
      scope: ["openid", "profile", "email", "User.Read"] 
    })(req, res, next);
  });
  app.get("/auth/microsoft/callback",
    passport.authenticate("microsoft", { failureRedirect: "/auth?error=microsoft_failed" }),
    (req, res) => {
      console.log('Microsoft OAuth callback success, redirecting to dashboard');
      res.redirect("/dashboard");
    }
  );
  
  app.get("/auth/linkedin", passport.authenticate("linkedin", { scope: ["r_liteprofile", "r_emailaddress"] }));
  app.get("/auth/linkedin/callback",
    passport.authenticate("linkedin", { failureRedirect: "/auth?error=linkedin_failed" }),
    (req, res) => {
      console.log('LinkedIn OAuth callback success, redirecting to dashboard');
      res.redirect("/dashboard");
    }
  );

  // API Usage endpoint
  app.get("/api/api-usage", isAuthenticated, async (req, res) => {
    try {
      const usage = await dbStorage.getApiUsageByUserId(req.user!.id);
      res.json(usage || []);
    } catch (error: any) {
      console.error("Error fetching API usage:", error);
      res.json([]); // Return empty array instead of error to prevent frontend crash
    }
  });

  // Record API usage (internal endpoint for BigQuery integration)
  app.post("/api/record-usage", isAuthenticated, async (req, res) => {
    try {
      const { apiKey, queryType, creditsUsed, endpoint, metadata } = req.body;
      
      // Find the API key to get the associated key ID
      const apiKeyRecord = await dbStorage.getApiKeyByKey(apiKey);
      if (!apiKeyRecord) {
        return res.status(404).json({ message: "API key not found" });
      }
      
      // Verify the API key belongs to the user
      if (apiKeyRecord.userId !== req.user!.id) {
        return res.status(403).json({ message: "API key does not belong to user" });
      }
      
      // Record the usage
      const usage = await dbStorage.recordApiUsage({
        userId: req.user!.id,
        apiKeyId: apiKeyRecord.id,
        endpoint: endpoint || queryType,
        creditsUsed: creditsUsed || 1,
        queryType: queryType || 'unknown',
        status: 'success',
        responseTime: metadata?.responseTime || 0,
      });
      
      // Deduct credits from user account
      await dbStorage.deductCredits(req.user!.id, creditsUsed || 1);
      
      res.json({ success: true, usage });
    } catch (error: any) {
      console.error("Error recording API usage:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Credit bundles endpoint
  app.get("/api/credit-bundles", async (req, res) => {
    try {
      const bundles = [
        { id: 1, name: "Starter", credits: 1000, price: 10, description: "Perfect for small projects" },
        { id: 2, name: "Professional", credits: 5000, price: 40, description: "Great for growing businesses" },
        { id: 3, name: "Enterprise", credits: 20000, price: 150, description: "For large scale operations" }
      ];
      res.json(bundles);
    } catch (error: any) {
      console.error("Error fetching credit bundles:", error);
      res.json([]); // Return empty array instead of error
    }
  });

  // Exchange rates endpoint
  app.get("/api/exchange-rates", (req, res) => {
    res.json({
      "USD": 1,
      "EUR": 0.93,
      "GBP": 0.79,
      "JPY": 155,
      "CAD": 1.36,
      "AUD": 1.52,
      "CHF": 0.91,
      "CNY": 7.23,
      "INR": 83.5,
      "SGD": 1.35,
      "ZAR": 18.61,
      "NZD": 1.64
    });
  });

  // User management endpoints
  app.get("/api/users", isAdmin, async (req, res) => {
    try {
      const users = await dbStorage.getAllUsers();
      res.json(users);
    } catch (error: any) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/users/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const user = await dbStorage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Users can only access their own data unless they're admin
      if (req.user!.id !== userId && req.user!.role !== USER_ROLES.BUSINESS_ADMIN && req.user!.role !== USER_ROLES.CLIENT_ADMIN) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      res.json(user);
    } catch (error: any) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // API Key management
  app.get("/api/api-keys", isAuthenticated, async (req, res) => {
    try {
      const apiKeys = await dbStorage.getApiKeysByUserId(req.user!.id);
      res.json(apiKeys);
    } catch (error: any) {
      console.error("Error fetching API keys:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/api-keys", isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertApiKeySchema.parse({
        ...req.body,
        userId: req.user!.id
      });
      
      const apiKey = await dbStorage.createApiKey(validatedData);
      
      // Sync to Redis for fast validation using direct Redis API
      try {
        const user = await dbStorage.getUser(req.user!.id);
        const redisPayload = {
          api_key: apiKey.key,
          user_id: req.user!.id.toString(),
          credits: user?.credits || 0,
          active: true
        };
        
        console.log(`Syncing new API key ${apiKey.id} to Redis:`, redisPayload);
        
        const response = await fetch(`${process.env.REDIS_API_URL}/redis/api-key`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-internal-token': process.env.INTERNAL_API_TOKEN!,
          },
          body: JSON.stringify(redisPayload)
        });
        
        if (response.ok) {
          const result = await response.json();
          console.log(`API key ${apiKey.id} synced to Redis successfully:`, result.message);
        } else {
          const error = await response.text();
          console.warn(`Redis sync failed for API key ${apiKey.id}:`, error);
        }
      } catch (redisError: any) {
        console.warn(`Redis sync error for API key ${apiKey.id}:`, redisError.message);
      }
      
      res.status(201).json(apiKey);
    } catch (error: any) {
      console.error("Error creating API key:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Credit management
  app.get("/api/credits", isAuthenticated, async (req, res) => {
    try {
      const user = await dbStorage.getUser(req.user!.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json({ credits: user.credits });
    } catch (error: any) {
      console.error("Error fetching credits:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Stripe payment intent endpoint
  app.post("/api/create-payment-intent", async (req, res) => {
    try {
      if (!stripe) {
        return res.status(500).json({ message: "Stripe is not configured" });
      }

      const { bundleId, amount } = req.body;
      console.log("Payment intent request:", { bundleId, amount, stripeConfigured: !!stripe });
      
      // If bundleId is provided, fetch the bundle details
      let finalAmount = amount;
      let bundleDetails = null;
      
      if (bundleId) {
        // Get bundle details from the static bundles
        const bundles = [
          { id: 1, name: "Starter", credits: 1000, price: 10, description: "Perfect for small projects" },
          { id: 2, name: "Professional", credits: 5000, price: 40, description: "Great for growing businesses" },
          { id: 3, name: "Enterprise", credits: 20000, price: 150, description: "For large scale operations" }
        ];
        
        bundleDetails = bundles.find(b => b.id === parseInt(bundleId));
        if (!bundleDetails) {
          return res.status(400).json({ message: "Invalid bundle ID" });
        }
        
        finalAmount = bundleDetails.price;
      }
      
      if (!finalAmount || isNaN(finalAmount)) {
        return res.status(400).json({ message: "Invalid amount provided" });
      }

      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(finalAmount * 100), // Convert to cents
        currency: "usd",
        metadata: bundleDetails ? {
          bundleId: bundleDetails.id.toString(),
          bundleName: bundleDetails.name,
          credits: bundleDetails.credits.toString()
        } : {}
      });
      
      res.json({ 
        clientSecret: paymentIntent.client_secret,
        bundleDetails
      });
    } catch (error: any) {
      console.error("Stripe payment intent error:", error);
      res.status(500).json({ 
        message: "Error creating payment intent: " + error.message 
      });
    }
  });

  // Payment success handler for Stripe
  app.post("/api/payment-success", isAuthenticated, async (req, res) => {
    try {
      if (!stripe) {
        return res.status(500).json({ message: "Stripe is not configured" });
      }

      const { paymentIntentId } = req.body;
      console.log("Processing payment success for:", paymentIntentId);
      
      if (!paymentIntentId) {
        return res.status(400).json({ message: "Payment intent ID is required" });
      }

      // Retrieve the payment intent from Stripe to verify it was successful
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      
      if (paymentIntent.status !== 'succeeded') {
        return res.status(400).json({ message: "Payment was not successful" });
      }

      // Extract bundle information from metadata
      const bundleId = paymentIntent.metadata.bundleId;
      const credits = parseInt(paymentIntent.metadata.credits || '0');
      const bundleName = paymentIntent.metadata.bundleName;
      
      if (!credits || credits <= 0) {
        return res.status(400).json({ message: "Invalid credit amount in payment" });
      }

      // Get current user credits
      const currentUser = await dbStorage.getUser(req.user!.id);
      if (!currentUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Calculate new credit total
      const newCredits = (currentUser.credits || 0) + credits;
      
      // Update user credits in database
      await dbStorage.updateUser(req.user!.id, {
        credits: newCredits
      });

      // Update Redis with new credit balance for all user's API keys
      try {
        const userApiKeys = await dbStorage.getApiKeysByUserId(req.user!.id);
        for (const apiKey of userApiKeys) {
          if (apiKey.active) {
            const response = await fetch(`${process.env.REDIS_API_URL}/redis/credits/${apiKey.key}`, {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
                'x-internal-token': process.env.INTERNAL_API_TOKEN!,
              },
              body: JSON.stringify({ credits: newCredits })
            });
            
            if (response.ok) {
              console.log(`Updated Redis credits for API key ${apiKey.key}: ${newCredits}`);
            } else {
              console.warn(`Failed to update Redis credits for API key ${apiKey.key}`);
            }
          }
        }
      } catch (redisError) {
        console.warn('Failed to update Redis credits:', redisError);
      }

      // Create a transaction record
      const transactionData = {
        userId: req.user!.id,
        amount: paymentIntent.amount / 100, // Convert from cents
        credits: credits,
        type: 'purchase' as const,
        status: 'completed' as const,
        paymentMethod: 'stripe',
        stripePaymentIntentId: paymentIntentId,
        bundleId: bundleId ? parseInt(bundleId) : undefined,
        description: `Credit purchase: ${bundleName || 'Unknown bundle'}`
      };

      await dbStorage.createTransaction(transactionData);

      console.log(`Credits added: ${credits} to user ${req.user!.id}, new total: ${newCredits}`);

      res.json({
        success: true,
        creditsAdded: credits,
        newTotal: newCredits,
        message: `Successfully added ${credits} credits to your account!`
      });

    } catch (error: any) {
      console.error("Payment success processing error:", error);
      res.status(500).json({ 
        message: "Error processing payment completion: " + error.message 
      });
    }
  });

  // Admin endpoint to get password reset tokens
  app.get("/api/admin/password-reset-tokens", isAuthenticated, async (req, res) => {
    try {
      // Check if user is admin
      if (req.user?.role !== 'business_admin' && req.user?.role !== 'client_admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const tokens = await dbStorage.getActivePasswordResetTokens();
      res.json(tokens);
    } catch (error: any) {
      console.error("Error fetching password reset tokens:", error);
      res.status(500).json({ message: "Error fetching tokens" });
    }
  });

  // Direct password reset endpoint for testing (development only)
  app.post("/api/admin/direct-password-reset", async (req, res) => {
    try {
      if (process.env.NODE_ENV === 'production') {
        return res.status(403).json({ message: "Not available in production" });
      }

      const { email, token, expires } = req.body;
      
      if (!email || !token || !expires) {
        return res.status(400).json({ message: "Email, token, and expires are required" });
      }

      const user = await dbStorage.getUserByEmail(email);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Update user with reset token
      await dbStorage.updateUser(user.id, {
        passwordResetToken: token,
        passwordResetExpires: new Date(expires),
      });

      console.log(`Direct password reset token set for ${email}`);
      res.json({ message: "Reset token set successfully" });
    } catch (error: any) {
      console.error("Error setting direct password reset:", error);
      res.status(500).json({ message: "Error setting reset token" });
    }
  });

  // PayPal routes
  app.get("/api/paypal/setup", async (req, res) => {
    await loadPaypalDefault(req, res);
  });

  app.post("/api/paypal/order", async (req, res) => {
    await createPaypalOrder(req, res);
  });

  app.post("/api/paypal/order/:orderID/capture", async (req, res) => {
    await capturePaypalOrder(req, res);
  });

  // Transaction history
  app.get("/api/transactions", isAuthenticated, async (req, res) => {
    try {
      const transactions = await dbStorage.getTransactions(req.user!.id);
      res.json(transactions);
    } catch (error: any) {
      console.error("Error fetching transactions:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // File upload endpoint
  app.post("/api/upload", isAuthenticated, upload.single('file'), (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      
      res.json({
        message: "File uploaded successfully",
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size
      });
    } catch (error: any) {
      console.error("Error uploading file:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Basic test endpoint
  app.get("/api/test", (req, res) => {
    res.json({ message: "API is working!" });
  });

  // Email verification endpoints
  app.post("/api/verify-email", async (req, res) => {
    try {
      const { token, email } = req.body;
      
      if (!token || !email) {
        return res.status(400).json({ message: "Token and email are required" });
      }

      // Note: This will require storage methods to be implemented
      res.status(200).json({ 
        message: "Email verification endpoint ready",
        note: "Storage methods needed for full implementation"
      });
    } catch (error) {
      console.error("Email verification error:", error);
      res.status(500).json({ message: "Server error during email verification" });
    }
  });

  // Request email change (sends verification to new email)
  app.post("/api/request-email-change", isAuthenticated, async (req, res) => {
    try {
      const { newEmail } = req.body;
      
      if (!newEmail) {
        return res.status(400).json({ message: "New email is required" });
      }

      // For now, just acknowledge the request
      res.status(200).json({ 
        message: "Email change verification system is ready",
        pendingEmail: newEmail,
        note: "Will send verification email when storage methods are implemented"
      });
    } catch (error) {
      console.error("Email change request error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  // New API Architecture Endpoints

  // Health check for all external APIs
  app.get("/api/health/external", async (req, res) => {
    try {
      const healthStatus = await integrationService.healthCheck();
      res.json({
        status: 'ok',
        services: healthStatus,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      console.error("Health check error:", error);
      res.status(500).json({ 
        status: 'error',
        message: error.message 
      });
    }
  });

  // Usage stats reporting endpoint (called by BG_Query_API)
  app.post("/api/usage-stats", async (req, res) => {
    try {
      // Verify internal API token
      const authToken = req.headers['x-internal-token'] || req.headers['authorization']?.replace('Bearer ', '');
      
      if (!authToken || authToken !== process.env.INTERNAL_API_TOKEN) {
        return res.status(401).json({ message: "Unauthorized - Invalid internal token" });
      }

      const { userId, apiKeyId, queryType, creditsUsed, metadata } = req.body;
      
      if (!userId || !apiKeyId || !creditsUsed) {
        return res.status(400).json({ 
          message: "Missing required fields: userId, apiKeyId, creditsUsed" 
        });
      }

      const usageStats = {
        userId,
        apiKeyId,
        queryType: queryType || 'unknown',
        creditsUsed,
        timestamp: new Date(),
        metadata
      };

      const result = await integrationService.recordUsageStats(usageStats);
      
      res.json({
        success: true,
        message: "Usage stats recorded successfully",
        data: result
      });

    } catch (error: any) {
      console.error("Error recording usage stats:", error);
      res.status(500).json({ 
        success: false,
        message: "Failed to record usage stats",
        error: error.message 
      });
    }
  });

  // Manual sync trigger endpoint
  app.post("/api/sync/full", isClientAdmin, async (req, res) => {
    try {
      const result = await integrationService.fullSync();
      res.json(result);
    } catch (error: any) {
      console.error("Full sync error:", error);
      res.status(500).json({ 
        success: false,
        message: "Full sync failed",
        error: error.message 
      });
    }
  });

  // Public sync endpoint for testing API key synchronization
  app.get("/api/sync/test", async (req, res) => {
    try {
      console.log("Starting API key sync from PostgreSQL to Redis...");
      
      // Get all API keys from PostgreSQL
      const allApiKeys = await db.select().from(apiKeys);
      
      let syncedCount = 0;
      let errors = [];
      
      for (const apiKey of allApiKeys) {
        try {
          // Get user credits for this API key
          const [user] = await db.select().from(users).where(eq(users.id, apiKey.userId));
          
          if (user && apiKey.active) {
            // Sync to Redis via integration service
            const redisData = {
              id: apiKey.id,
              key: apiKey.key,
              user_id: apiKey.userId,
              active: apiKey.active,
              credits: user.credits
            };
            
            // Actually sync to Redis via integration service
            const syncResult = await integrationService.syncApiKeyToRedis(redisData);
            if (syncResult.success) {
              console.log(`Successfully synced API key ${apiKey.id} to Redis`);
              syncedCount++;
            } else {
              errors.push(`Redis sync failed for API key ${apiKey.id}: ${syncResult.message}`);
            }
          }
        } catch (error: any) {
          errors.push(`Failed to sync API key ${apiKey.id}: ${error.message}`);
        }
      }
      
      res.json({
        success: true,
        message: `API Sync Test Complete - Found ${allApiKeys.length} keys, synced ${syncedCount} to Redis`,
        total_keys: allApiKeys.length,
        synced_keys: syncedCount,
        errors: errors,
        keys_summary: allApiKeys.map(k => ({
          id: k.id,
          user_id: k.userId,
          key_preview: k.key.substring(0, 10) + '...',
          active: k.active
        }))
      });
      
    } catch (error: any) {
      console.error("API key sync error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to sync API keys",
        error: error.message
      });
    }
  });

  // Test PG API connection
  app.get("/api/test/pg-api", isClientAdmin, async (req, res) => {
    try {
      const isConnected = await pgApiClient.testConnection();
      res.json({
        connected: isConnected,
        url: process.env.PG_API_URL,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      console.error("PG API test error:", error);
      res.status(500).json({ 
        connected: false,
        error: error.message 
      });
    }
  });

  // OAuth debug endpoint
  app.get('/api/oauth/debug', (req, res) => {
    res.json({
      baseUrl: 'https://client.datazag.com',
      environment: process.env.NODE_ENV || 'development',
      replSlug: process.env.REPL_SLUG,
      replOwner: process.env.REPL_OWNER,
      callbackUrls: {
        google: 'https://client.datazag.com/auth/google/callback',
        github: 'https://client.datazag.com/auth/github/callback',
        linkedin: 'https://client.datazag.com/auth/linkedin/callback'
      },
      actualUrls: 'OAuth strategies now use correct client.datazag.com URLs'
    });
  });

  // OAuth test page for configuration verification
  app.get('/oauth-test', (req, res) => {
    const testPagePath = path.join(process.cwd(), 'test-oauth.html');
    res.sendFile(testPagePath);
  });

  // Usage reporting endpoint - receives API key and credits used from public APIs
  app.post("/api/usage/report", async (req, res) => {
    try {
      const { apiKey, creditsUsed, endpoint, apiService, queryType, metadata } = req.body;

      // Validate required fields
      if (!apiKey || !creditsUsed || creditsUsed <= 0) {
        return res.status(400).json({ 
          success: false, 
          message: "Invalid usage data: apiKey and creditsUsed required" 
        });
      }

      const usageEndpoint = endpoint || metadata?.endpoint || '/api/query';
      const serviceType = apiService || 'bigquery';
      
      console.log(`Processing usage report - API: ${serviceType}, Endpoint: ${usageEndpoint}, Credits: ${creditsUsed}`);

      // Get API key details from database
      const apiKeyRecord = await dbStorage.getApiKeyByKey(apiKey);
      if (!apiKeyRecord) {
        return res.status(404).json({
          success: false,
          message: "API key not found"
        });
      }

      // Allow processing for production usage reporting regardless of active status
      if (!apiKeyRecord.active) {
        console.log(`Processing usage for inactive API key: ${apiKey} - allowing for production use`);
      }

      // Get current user credits
      const user = await dbStorage.getUser(apiKeyRecord.userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found"
        });
      }

      // Check if user has enough credits
      if (user.credits < creditsUsed) {
        return res.status(402).json({
          success: false,
          message: "Insufficient credits",
          currentCredits: user.credits,
          creditsRequired: creditsUsed
        });
      }

      // Calculate new credit balance
      const newCredits = user.credits - creditsUsed;

      // Record the usage in database with detailed tracking
      await dbStorage.recordApiUsage({
        userId: user.id,
        apiKeyId: apiKeyRecord.id,
        endpoint: usageEndpoint,
        apiService: serviceType,
        creditsUsed,
        queryType: queryType || 'query',
        status: 'success',
        responseTime: metadata?.responseTime || 0,
        usageDateTime: new Date(),
        metadata: metadata || {}
      });

      // Update user credits in database  
      const updatedUser = await dbStorage.updateUser(user.id, { credits: newCredits });

      // Update Redis cache with new credit balance for this API key
      try {
        // Update credits directly for this API key in Redis
        const creditUpdateResult = await redisSyncService.updateCredits(apiKey, newCredits);
        
        if (creditUpdateResult.success) {
          console.log(`✓ Redis updated for API key ${apiKey}: ${newCredits} credits remaining`);
        } else {
          console.error(`✗ Redis sync failed for ${apiKey}:`, creditUpdateResult.message);
        }
      } catch (redisError) {
        console.error('✗ Redis sync error:', redisError.message || redisError);
        // Continue processing even if Redis sync fails
      }

      res.json({
        success: true,
        message: 'Usage recorded successfully',
        remainingCredits: newCredits,
        creditsUsed,
        endpoint: usageEndpoint,
        apiService: serviceType,
        usageDateTime: new Date().toISOString(),
        apiKey: apiKey
      });

    } catch (error) {
      console.error('Usage reporting error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  });

  // Credit balance endpoint for public API to check before processing
  app.get("/api/credits/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ 
          success: false, 
          message: "Invalid user ID" 
        });
      }

      const user = await dbStorage.getUser(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found"
        });
      }

      res.json({
        success: true,
        userId: userId,
        credits: user.credits || 0
      });
    } catch (error) {
      console.error('Credits check error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  });

  // Sync endpoint to force Redis sync
  app.post("/api/sync/redis", async (req, res) => {
    if (!req.isAuthenticated() || req.user?.role !== USER_ROLES.ADMIN) {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const result = await integrationService.fullSync();
      if (result) {
        res.json({
          success: true,
          message: 'Redis sync completed successfully'
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Redis sync failed'
        });
      }
    } catch (error) {
      console.error('Redis sync error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  });

  // Debug endpoint to compare PostgreSQL vs Redis data
  app.get("/api/debug/data-comparison", async (req, res) => {
    if (!req.isAuthenticated() || req.user?.role !== USER_ROLES.ADMIN) {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const comparison = {
        postgresql: {},
        redis: {},
        discrepancies: []
      };

      // Get PostgreSQL data
      const pgApiKeys = await db.select().from(apiKeys);
      const pgUsers = await db.select().from(users);
      
      comparison.postgresql = {
        apiKeys: pgApiKeys.map(k => ({
          id: k.id,
          userId: k.userId,
          keyPreview: k.key.substring(0, 20) + '...',
          active: k.active
        })),
        users: pgUsers.map(u => ({
          id: u.id,
          credits: u.credits,
          active: u.active
        }))
      };

      // Test Redis connection and get data
      const redisUrl = process.env.REDIS_API_URL;
      const token = process.env.INTERNAL_API_TOKEN;
      
      if (redisUrl && token) {
        try {
          // Get Redis sync status
          const redisKeysResponse = await fetch(`${redisUrl}/redis/sync-status`, {
            headers: { 'x-internal-token': token }
          });
          
          if (redisKeysResponse.ok) {
            comparison.redis.apiKeys = await redisKeysResponse.json();
          } else {
            comparison.redis.apiKeysError = `HTTP ${redisKeysResponse.status}`;
          }

          // Get Redis dump
          const redisCreditsResponse = await fetch(`${redisUrl}/redis/dump`, {
            headers: { 'x-internal-token': token }
          });
          
          if (redisCreditsResponse.ok) {
            comparison.redis.credits = await redisCreditsResponse.json();
          } else {
            comparison.redis.creditsError = `HTTP ${redisCreditsResponse.status}`;
          }

        } catch (error) {
          comparison.redis.connectionError = error.message;
        }
      } else {
        comparison.redis.configError = 'Missing REDIS_API_URL or INTERNAL_API_TOKEN';
      }

      // Compare data and find discrepancies
      if (comparison.redis.apiKeys) {
        pgApiKeys.forEach(pgKey => {
          const redisMatch = comparison.redis.apiKeys.find(rKey => 
            rKey.apiKey === pgKey.key || rKey.key === pgKey.key
          );
          
          if (!redisMatch) {
            comparison.discrepancies.push({
              type: 'missing_in_redis',
              data: `API Key ${pgKey.id} (${pgKey.key.substring(0, 20)}...)`
            });
          }
        });
      }

      res.json({
        success: true,
        timestamp: new Date().toISOString(),
        data: comparison
      });

    } catch (error) {
      console.error('Data comparison error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to compare data',
        error: error.message
      });
    }
  });

  // Test endpoint to verify JSON parsing
  app.post("/api/test-json", (req, res) => {
    console.log('Test JSON endpoint - Body:', req.body);
    res.json({ received: req.body, success: true });
  });

  // Production API usage reporting endpoint
  app.post("/api/usage/report", async (req, res) => {
    console.log('=== USAGE ENDPOINT CALLED ===');
    console.log('Request body:', req.body);
    
    const { apiKey, creditsUsed, endpoint, apiService, queryType, metadata } = req.body || {};
    
    if (!apiKey || !creditsUsed || creditsUsed <= 0) {
      return res.status(400).json({ 
        success: false,
        message: "Invalid usage data: apiKey and creditsUsed required"
      });
    }

    try {
      console.log(`Processing usage: ${apiKey} used ${creditsUsed} credits for ${endpoint}`);
      
      // Find API key in database
      const apiKeyRecord = await dbStorage.getApiKeyByKey(apiKey);
      if (!apiKeyRecord) {
        return res.status(404).json({ 
          success: false,
          message: "API key not found" 
        });
      }
      
      // Get user details
      const user = await dbStorage.getUser(apiKeyRecord.userId);
      if (!user) {
        return res.status(404).json({ 
          success: false,
          message: "User not found" 
        });
      }
      
      // Check sufficient credits
      if (user.credits < creditsUsed) {
        return res.status(402).json({ 
          success: false,
          message: "Insufficient credits",
          currentCredits: user.credits,
          creditsRequired: creditsUsed
        });
      }
      
      // Calculate new balance
      const newCredits = user.credits - creditsUsed;
      
      // Record usage in database using correct schema
      await dbStorage.recordApiUsage({
        userId: apiKeyRecord.userId,
        apiKeyId: apiKeyRecord.id,
        endpoint: endpoint || '/api/unknown',
        creditsUsed: creditsUsed,
        queryType: queryType || 'query',
        status: 'success',
        responseTime: metadata?.responseTime || 0
      });
      
      // Update user credits
      await dbStorage.updateUser(user.id, { credits: newCredits });
      
      // Update Redis cache
      await integrationService.syncApiKeyToRedis({
        api_key: apiKey,
        credits: newCredits,
        user_id: user.id
      });
      
      console.log(`Credits deducted: ${creditsUsed} from user ${apiKeyRecord.userId}, new total: ${newCredits}`);
      
      res.json({
        success: true,
        creditsRemaining: newCredits,
        creditsDeducted: creditsUsed,
        message: `${creditsUsed} credits deducted successfully`
      });

    } catch (error: any) {
      console.error('Usage reporting error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  });

  // Internal endpoint for recording usage with authentication
  app.post("/api/record-usage", async (req, res) => {
    try {
      // Verify internal token
      const token = req.headers['x-internal-token'];
      console.log('Received token:', token ? `${token.toString().substring(0, 15)}...` : 'undefined');
      console.log('Expected token:', process.env.INTERNAL_API_TOKEN ? `${process.env.INTERNAL_API_TOKEN.substring(0, 15)}...` : 'undefined');
      
      if (!token || token !== process.env.INTERNAL_API_TOKEN) {
        return res.status(401).json({ message: "Invalid or missing internal token" });
      }
      
      const { api_key, endpoint, credits_used, timestamp, metadata } = req.body;
      
      // Use same logic as webhook but with internal authentication
      const apiKey = await dbStorage.getApiKeyByKey(api_key);
      if (!apiKey) {
        return res.status(404).json({ message: "API key not found" });
      }
      
      const user = await dbStorage.getUser(apiKey.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      if (user.credits < credits_used) {
        return res.status(402).json({ message: "Insufficient credits" });
      }
      
      const newCredits = user.credits - credits_used;
      await dbStorage.updateUser(apiKey.userId, { credits: newCredits });
      
      // Update Redis
      try {
        const response = await fetch(`${process.env.REDIS_API_URL}/redis/credits/${api_key}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'x-internal-token': process.env.INTERNAL_API_TOKEN!,
          },
          body: JSON.stringify({ credits: newCredits })
        });
      } catch (redisError) {
        console.warn('Redis update failed:', redisError);
      }
      
      const usageData = {
        userId: apiKey.userId,
        apiKeyId: apiKey.id,
        endpoint: endpoint || 'unknown',
        creditsUsed: credits_used,
        metadata: metadata || {},
        timestamp: timestamp ? new Date(timestamp) : new Date()
      };
      
      await dbStorage.createApiUsage(usageData);
      
      res.json({
        success: true,
        creditsRemaining: newCredits,
        message: "Usage recorded successfully"
      });
      
    } catch (error: any) {
      console.error("Record usage error:", error);
      res.status(500).json({ message: "Error recording usage: " + error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}