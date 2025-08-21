import { pgTable, text, serial, integer, boolean, timestamp, json, numeric, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Define available user roles
export const USER_ROLES = {
  USER: 'user',          // Regular user/customer
  CLIENT_ADMIN: 'client_admin',  // Client administrator (manages their company's users)
  BUSINESS_ADMIN: 'business_admin',  // Business administrator (manages the platform)
} as const;

export const users: any = pgTable("users", {
  id: serial("id").primaryKey(),
  // Using first_name and last_name as primary fields
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  username: text("username"), // Keep as optional for backward compatibility
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  company: text("company").notNull(), // Required company field
  website: text("website"), 
  companyAddress: text("company_address"),
  credits: integer("credits").default(0).notNull(),
  stripeCustomerId: text("stripe_customer_id"),
  role: text("role").default(USER_ROLES.USER).notNull(),
  parentUserId: integer("parent_user_id").references(() => users.id), // For client admin to manage users
  canPurchaseCredits: boolean("can_purchase_credits").default(true).notNull(),
  gracePeriodEnd: timestamp("grace_period_end"),
  creditThreshold: integer("credit_threshold"),
  active: boolean("active").default(true).notNull(), // Add missing active field
  // Account verification and security
  emailVerified: boolean("email_verified").default(false).notNull(),
  emailVerificationToken: text("email_verification_token"),
  emailVerificationExpires: timestamp("email_verification_expires"),
  passwordResetToken: text("password_reset_token"),
  passwordResetExpires: timestamp("password_reset_expires"),
  lastLogin: timestamp("last_login"),
  failedLoginAttempts: integer("failed_login_attempts").default(0).notNull(),
  accountLocked: boolean("account_locked").default(false).notNull(),
  accountLockedUntil: timestamp("account_locked_until"),
  twoFactorEnabled: boolean("two_factor_enabled").default(false).notNull(),
  twoFactorSecret: text("two_factor_secret"),
  recoveryCodes: text("recovery_codes"), // JSON-encoded array of one-time recovery codes
  // OAuth related fields
  googleId: text("google_id").unique(),
  githubId: text("github_id").unique(),
  microsoftId: text("microsoft_id").unique(),
  linkedinId: text("linkedin_id").unique(),
});

export const apiKeys = pgTable("api_keys", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  key: text("key").notNull().unique(),
  name: text("name").notNull(),
  isActive: boolean("active").default(true).notNull(), // Maps to 'active' column in database
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const creditBundles = pgTable("credit_bundles", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  credits: integer("credits").notNull(),
  price: integer("price").notNull(), // in cents
  currency: text("currency").default('usd'),
  popular: boolean("popular").default(false),
});

export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  type: text("type").notNull(), // "purchase", "usage"
  amount: integer("amount").notNull(), // positive for purchase, negative for usage
  description: text("description").notNull(),
  apiKeyId: integer("api_key_id").references(() => apiKeys.id),
  status: text("status").notNull(), // "success", "failed", "pending"
  metadata: json("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const apiUsage = pgTable("api_usage", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  apiKeyId: integer("api_key_id")
    .notNull()
    .references(() => apiKeys.id),
  endpoint: text("endpoint").notNull(),
  queryType: text("query_type").default("unknown").notNull(),
  creditsUsed: integer("credits_used").notNull(),
  status: text("status").default("success").notNull(),
  responseTime: integer("response_time").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Define discount codes table
export const discountCodes = pgTable("discount_codes", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  discountType: text("discount_type").notNull(), // "percentage", "fixed"
  discountValue: numeric("discount_value").notNull(), // percentage (0-100) or fixed amount in cents
  isActive: boolean("active").default(true).notNull(),
  maxUses: integer("max_uses"), // null means unlimited
  currentUses: integer("current_uses").default(0).notNull(),
  expiresAt: timestamp("expires_at"), // null means no expiration
  createdAt: timestamp("created_at").defaultNow().notNull(),
  minPurchaseAmount: integer("min_purchase_amount").default(0).notNull(), // minimum purchase amount in cents
  maxDiscountAmount: integer("max_discount_amount"), // maximum discount amount in cents (for percentage discounts)
  description: text("description"),
  createdByUserId: integer("created_by_user_id").references(() => users.id),
});

// Admin access request statuses
export const ADMIN_REQUEST_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
} as const;

// Subscription tiers/plans
export const SUBSCRIPTION_INTERVALS = {
  MONTHLY: 'monthly',
  QUARTERLY: 'quarterly',
  ANNUAL: 'annual',
} as const;

export const subscriptionPlans = pgTable("subscription_plans", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  features: text("features").array(), // Array of features included in this plan
  monthlyPrice: integer("monthly_price").notNull(), // stored in cents
  quarterlyPrice: integer("quarterly_price"), // stored in cents (optional)
  annualPrice: integer("annual_price"), // stored in cents (optional)
  creditsPerMonth: integer("credits_per_month").notNull(),
  maxApiKeys: integer("max_api_keys").notNull(),
  stripePriceIdMonthly: text("stripe_price_id_monthly"),
  stripePriceIdQuarterly: text("stripe_price_id_quarterly"),
  stripePriceIdAnnual: text("stripe_price_id_annual"),
  isActive: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// User subscriptions
export const userSubscriptions = pgTable("user_subscriptions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  planId: integer("plan_id").notNull().references(() => subscriptionPlans.id),
  status: text("status").notNull(), // active, canceled, expired, etc.
  currentPeriodStart: timestamp("current_period_start").notNull(),
  currentPeriodEnd: timestamp("current_period_end").notNull(),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false),
  interval: text("interval").notNull(),
  stripeSubscriptionId: text("stripe_subscription_id"),
  paypalSubscriptionId: text("paypal_subscription_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const adminRequests = pgTable("admin_requests", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  reason: text("reason").notNull(),
  status: varchar("status", { length: 20 }).default(ADMIN_REQUEST_STATUS.PENDING).notNull(),
  adminNotes: text("admin_notes"),
  reviewedBy: integer("reviewed_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users)
  .omit({ id: true })
  .extend({
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    email: z.string().email("Please enter a valid email"),
    company: z.string().min(1, "Company name is required"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const insertApiKeySchema = createInsertSchema(apiKeys).omit({
  id: true,
  key: true,
  createdAt: true,
});

export const insertCreditBundleSchema = createInsertSchema(creditBundles).omit({
  id: true,
});

export const insertTransactionSchema = createInsertSchema(transactions).omit({
  id: true,
  createdAt: true,
});

export const insertApiUsageSchema = createInsertSchema(apiUsage).omit({
  id: true,
  createdAt: true,
});

export const insertDiscountCodeSchema = createInsertSchema(discountCodes).omit({
  id: true,
  createdAt: true,
  currentUses: true,
});

export const insertAdminRequestSchema = createInsertSchema(adminRequests).omit({
  id: true,
  status: true,
  adminNotes: true,
  reviewedBy: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSubscriptionPlanSchema = createInsertSchema(subscriptionPlans).omit({
  id: true,
  createdAt: true,
});

export const insertUserSubscriptionSchema = createInsertSchema(userSubscriptions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type ApiKey = typeof apiKeys.$inferSelect;
export type InsertApiKey = z.infer<typeof insertApiKeySchema>;
export type CreditBundle = typeof creditBundles.$inferSelect;
export type InsertCreditBundle = z.infer<typeof insertCreditBundleSchema>;
export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type ApiUsage = typeof apiUsage.$inferSelect;
export type InsertApiUsage = z.infer<typeof insertApiUsageSchema>;
export type DiscountCode = typeof discountCodes.$inferSelect;
export type InsertDiscountCode = z.infer<typeof insertDiscountCodeSchema>;
export type AdminRequest = typeof adminRequests.$inferSelect;
export type InsertAdminRequest = z.infer<typeof insertAdminRequestSchema>;
export type SubscriptionPlan = typeof subscriptionPlans.$inferSelect;
export type InsertSubscriptionPlan = z.infer<typeof insertSubscriptionPlanSchema>;
export type UserSubscription = typeof userSubscriptions.$inferSelect;
export type InsertUserSubscription = z.infer<typeof insertUserSubscriptionSchema>;

// Login schema
export const loginSchema = z.object({
  email: z.string().email("Please enter a valid email").min(1, "Email is required"),
  password: z.string().min(1, "Password is required"),
});

export type LoginCredentials = z.infer<typeof loginSchema>;
