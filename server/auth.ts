import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { hash, compare } from "bcrypt";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";
import { setupOAuthStrategies } from "./oauth-strategies";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

async function hashPassword(password: string): Promise<string> {
  return await hash(password, 10);
}

async function comparePasswords(supplied: string, stored: string): Promise<boolean> {
  return await compare(supplied, stored);
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.JWT_SECRET!,
    resave: false,
    saveUninitialized: true, // Create sessions for unauthenticated users
    store: storage.sessionStore,
    name: 'connect.sid',
    rolling: true, // Refresh session on each request
    cookie: {
      secure: true, // Required for HTTPS
      sameSite: 'none', // Allow cross-site cookies
      maxAge: 86400000, // 24 hours
      httpOnly: false, // Allow JS access for debugging
      path: '/',
    },
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());
  
  // Setup OAuth strategies after passport is initialized
  setupOAuthStrategies();

  passport.use(
    new LocalStrategy({ usernameField: 'email' }, async (email, password, done) => {
      console.log('LocalStrategy called for email:', email);
      try {
        const user = await storage.getUserByEmail(email);
        console.log('User lookup result:', user ? `Found ${user.email}` : 'Not found');
        
        if (!user) {
          console.log('User not found');
          return done(null, false, { message: 'User not found' });
        }
        
        console.log('Comparing passwords...');
        const isValidPassword = await comparePasswords(password, user.password);
        console.log('Password valid:', isValidPassword);
        
        if (!isValidPassword) {
          return done(null, false, { message: 'Invalid password' });
        }
        
        console.log('Authentication successful for user:', user.email);
        return done(null, user);
      } catch (error) {
        console.error('LocalStrategy error:', error);
        return done(error);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    const user = await storage.getUser(id);
    done(null, user);
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      console.log("Registration request body:", req.body);
      
      const existingUser = await storage.getUserByEmail(req.body.email);
      if (existingUser) {
        return res.status(400).json({ message: "User already exists" });
      }

      // Validate required fields
      if (!req.body.firstName || !req.body.lastName || !req.body.email || !req.body.password || !req.body.company) {
        return res.status(400).json({ message: "First name, last name, email, password, and company are required" });
      }
      
      // Create username from firstName and lastName for backward compatibility
      const username = `${req.body.firstName} ${req.body.lastName}`.trim();
      
      const userData = {
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        username, // Keep for backward compatibility
        email: req.body.email,
        company: req.body.company,
        password: await hashPassword(req.body.password),
      };

      console.log("Creating user with data:", { ...userData, password: '[HIDDEN]' });
      
      const user = await storage.createUser(userData);

      req.login(user, (err) => {
        if (err) {
          console.error("Login after registration error:", err);
          return next(err);
        }
        console.log("Registration auto-login successful:", {
          sessionID: req.sessionID,
          userEmail: user.email,
          isAuthenticated: req.isAuthenticated()
        });
        res.status(201).json(user);
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Registration failed: " + error.message });
    }
  });

  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err, user, info) => {
      console.log('Authentication result:', { err: !!err, user: !!user, info });
      
      if (err) {
        console.error('Authentication error:', err);
        return next(err);
      }
      
      if (!user) {
        console.log('Authentication failed:', info);
        return res.status(401).json({ message: "Invalid credentials" });
      }
      
      // Manually log in the user
      req.login(user, (loginErr) => {
        if (loginErr) {
          console.error('Login error:', loginErr);
          return next(loginErr);
        }
        
        console.log('Login successful:', {
          sessionID: req.sessionID,
          userEmail: user.email,
          isAuthenticated: req.isAuthenticated(),
          sessionKeys: Object.keys(req.session || {}),
          passportData: req.session?.passport
        });
        
        res.status(200).json(user);
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/me", (req, res) => {
    console.log('Authentication check:', {
      sessionID: req.sessionID,
      isAuthenticated: req.isAuthenticated(),
      sessionKeys: req.session ? Object.keys(req.session) : [],
      passportData: req.session?.passport,
      cookies: req.headers.cookie ? 'present' : 'missing',
      origin: req.headers.origin,
      userAgent: req.headers['user-agent']?.substring(0, 50)
    });
    
    if (!req.isAuthenticated()) {
      console.log('Not authenticated, returning 401');
      return res.sendStatus(401);
    }
    
    console.log('User authenticated, returning user data');
    res.json(req.user);
  });
}