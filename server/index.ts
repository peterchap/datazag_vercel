
// Load environment variables first, before any other imports
import dotenv from 'dotenv';
dotenv.config();

// Force correct BASE_URL for OAuth callbacks
if (!process.env.BASE_URL) {
  process.env.BASE_URL = 'https://client.datazag.com';
}

// Debug Microsoft OAuth environment variables
console.log('Microsoft OAuth secrets check on server startup:', {
  MICROSOFT_CLIENT_ID: process.env.MICROSOFT_CLIENT_ID ? 'Present' : 'Missing',
  MICROSOFT_CLIENT_SECRET: process.env.MICROSOFT_CLIENT_SECRET ? 'Present' : 'Missing'
});

import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import cors from "cors";

const app = express();

// Configure CORS to allow the frontend to send credentials from any origin
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (mobile apps, curl, Postman, etc.)
    if (!origin) return callback(null, true);
    
    // Allow all Replit domains and localhost
    const allowedOrigins = [
      'https://client.datazag.com',
      'http://localhost:5173', 
      'http://localhost:5000',
      /^https:\/\/.*\.repl\.co$/,
      /^https:\/\/.*\.replit\.app$/,
      /^https:\/\/.*\.replit\.dev$/,
    ];
    
    const isAllowed = allowedOrigins.some(allowed => {
      if (typeof allowed === 'string') return allowed === origin;
      return allowed.test(origin);
    });
    
    callback(null, isAllowed);
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'X-Requested-With'],
}));

// Critical: JSON parsing middleware must come before routes
app.use(express.json({ limit: '2gb' }));
app.use(express.urlencoded({ extended: false, limit: '2gb' }));

// Remove conflicting middleware that was preventing the endpoint from working

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }



      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error('=== SERVER ERROR ===');
    console.error('Path:', req.path);
    console.error('Method:', req.method);
    console.error('Error:', err);
    console.error('Stack:', err.stack);
    console.error('=====================');

    res.status(status).json({ message });
  });

  // Add a middleware to handle auth routes before Vite takes over
  app.use((req, res, next) => {
    // If it's an auth route, ensure it doesn't get caught by Vite
    if (req.path.startsWith('/auth/')) {
      console.log('Pre-Vite auth route interceptor:', req.path);
      // Let it continue to our Express auth routes
      return next();
    }
    next();
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  
  // Add a simple test route with the /api prefix to ensure it's handled by Express
  app.get('/api/server-status', (req, res) => {
    res.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      serverInfo: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        pid: process.pid
      }
    });
  });
  
  // Listen with error handling
  console.log(`Attempting to bind server to 0.0.0.0:${port}...`);
  
  server.listen({
    port,
    host: "0.0.0.0", // Listen on all available network interfaces
    reusePort: true,
  }, () => {
    const address = server.address();
    console.log(`Server address() returned: ${JSON.stringify(address)}`);
    
    if (address && typeof address !== 'string') {
      log(`Server listening on ${address.address}:${address.port}`);
    }
    log(`serving on port ${port}`);
    
    // Display environment information
    console.log(`Node.js version: ${process.version}`);
    console.log(`Current directory: ${process.cwd()}`);
    console.log(`Environment: ${process.env.NODE_ENV}`);
    
    // Log network interfaces for troubleshooting
    try {
      const { networkInterfaces } = require('os');
      const nets = networkInterfaces();
      console.log('Available network interfaces:');
      for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
          // Skip internal interfaces
          if (net.internal) continue;
          console.log(`Interface: ${name}, Address: ${net.address}, Family: ${net.family}`);
        }
      }
    } catch (err) {
      console.log('Unable to enumerate network interfaces');
    }
    
    log(`Server should be accessible at http://localhost:${port} and http://<your-ip>:${port}`);
  });
  
  // Add explicit error handling for the server
  server.on('error', (error: any) => {
    if (error.code === 'EADDRINUSE') {
      log(`Error: Port ${port} is already in use by another process`);
    } else {
      log(`Server error: ${error.message}`);
    }
  });
})();
