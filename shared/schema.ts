import {
  timestamp,
  pgTable,
  text,
  primaryKey,
  integer,
  boolean,
  varchar,
  serial,
  jsonb,
  numeric,
  json,
  pgEnum,
  AnyPgColumn,
} from "drizzle-orm/pg-core"
import type { AdapterAccount } from "@auth/core/adapters"

import { relations } from "drizzle-orm";
import { randomUUID } from "crypto";

// PostgreSQL enum for payment methods used in the transactions table.
// Define once to avoid duplicate enum creation in migrations.
export const paymentMethodEnum = pgEnum('payment_method', ['stripe', 'paypal', 'crypto', 'manual']);
export const transactionTypeEnum = pgEnum('transaction_type', ['credits_purchase', 'api_usage', 'refund', 'subscription']);
export const transactionStatusEnum = pgEnum('transaction_status', ['pending', 'completed', 'failed']);

// --- Main Users Table ---
export const users = pgTable("users", {
  id: text("id").primaryKey().$defaultFn(() => randomUUID()),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  username: text("username"),
  password: text("password"), // Can be null for OAuth users
  email: text("email").notNull().unique(),
  company: text("company").notNull(),
  website: text("website"),
  image: text("image"),
  companyAddress: text("company_address"),
  credits: integer("credits").default(0).notNull(),
  creditsPurchased: integer("credits_purchased").default(0),
  stripeCustomerId: text("stripe_customer_id"),
  role: text("role").default('user').notNull(),
  parentUserId: text("parent_user_id").references((): AnyPgColumn => users.id, { onDelete: "set null" }),
  canPurchaseCredits: boolean("can_purchase_credits").default(true).notNull(),
  emailVerified: timestamp("email_verified", { mode: "date" }),
  passwordResetToken: text("password_reset_token"),
  passwordResetExpires: timestamp("password_reset_expires", { mode: 'string' }),
  lastLogin: timestamp("last_login", { mode: 'string' }),
  recoveryCodes: text("recovery_codes"),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
});

// --- Standard next-auth Tables ---
export const accounts = pgTable("account", {
    userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccount["type"]>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"), 
  }, (account) => ({
    compoundKey: primaryKey({ columns: [account.provider, account.providerAccountId] }),
  })
);

export const sessions = pgTable("session", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable("verificationToken", {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  }, (vt) => ({
    compoundKey: primaryKey({ columns: [vt.identifier, vt.token] }),
  })
);

// --- Your Custom Tables ---
export const emailVerificationTokens = pgTable("email_verification_tokens", {
    id: serial("id").primaryKey(),
    token: text("token").notNull().unique(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { mode: 'string' }).notNull(),
    used: boolean("used").default(false).notNull(),
    createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
    metadata: jsonb("metadata"),
});

export const apiKeys = pgTable("api_keys", {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    key: text("key").notNull().unique(),
    name: text("name").notNull(),
    active: boolean("active").default(true).notNull(),
    createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
});

export const apiUsage = pgTable("api_usage", {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    apiKeyId: integer("api_key_id").notNull().references(() => apiKeys.id),
    endpoint: text("endpoint").notNull(),
    creditsUsed: integer("credits_used").notNull(),
    status: text("status").default('success').notNull(),
    responseTime: integer("response_time").default(0),
    createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
});

export const creditBundles = pgTable("credit_bundles", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  credits: integer("credits").notNull(),
  price: integer("price").notNull(),
  popular: boolean("popular").default(false),
  currency: text("currency").notNull(),
});

export const discountCodes = pgTable("discount_codes", {
    id: serial("id").primaryKey(),
    code: text("code").notNull().unique(),
    discountType: text("discount_type").notNull(),
    discountValue: numeric("discount_value").notNull(),
    active: boolean("active").default(true).notNull(),
    createdByUserId: text("created_by_user_id").references(() => users.id),
});

export const transactions = pgTable("transactions", {
  // Core IDs
  id: text("id").primaryKey(), // The unique ID from the payment gateway (e.g., Stripe's cs_...)
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  
  // Transaction Details
  type: transactionTypeEnum("type").notNull(),
  status: transactionStatusEnum("status").notNull(),
  description: text("description").notNull(),
  
  // Monetary Values
  amountInBaseCurrencyCents: integer("amount_in_base_currency_cents").notNull(),
  originalAmount: integer("original_amount").notNull(),
  originalCurrency: text("original_currency").notNull(),
  exchangeRateAtPurchase: numeric("exchange_rate_at_purchase", { precision: 10, scale: 6 }).notNull(),
  
  // Payment Gateway Details
  paymentMethod: paymentMethodEnum("payment_method").notNull(),
  gatewayCustomerId: text("gateway_customer_id"), // Optional: The customer ID from the gateway
  
  // App-Specific Data
  credits: integer("credits").notNull(),
  metadata: json("metadata"), // Optional: For storing extra unstructured data
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const creditTransactions = pgTable("credit_transactions", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  amount: integer("amount").notNull(),
  type: text("type").notNull(), // 'allocation', 'usage', 'purchase', 'refund'
  description: text("description"),
  createdAt: timestamp("created_at", { mode: 'string' }).notNull().defaultNow(),
});

export const subscriptionPlans = pgTable("subscription_plans", {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
});

export const userSubscriptions = pgTable("user_subscriptions", {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    planId: integer("plan_id").notNull().references(() => subscriptionPlans.id),
    status: text("status").notNull(),
    currentPeriodStart: timestamp("current_period_start", { mode: 'string' }).notNull(),
    currentPeriodEnd: timestamp("current_period_end", { mode: 'string' }).notNull(),
    cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false),
    interval: text("interval").notNull(),
    stripeSubscriptionId: text("stripe_subscription_id"),
});

export const adminRequests = pgTable("admin_requests", {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    category: varchar("category", { length: 50 }).notNull(),
    subject: text("subject").notNull(),
    description: text("description").notNull(),
    status: varchar("status", { length: 20 }).default('pending').notNull(),
    reviewedBy: text("reviewed_by").references(() => users.id),
    createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
});

export const requestComments = pgTable("request_comments", {
  id: serial("id").primaryKey(),
  requestId: integer("request_id").notNull().references(() => adminRequests.id, { onDelete: 'cascade' }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  authorType: varchar("author_type", { length: 50 }).default('user').notNull(),
  comment: text("comment").notNull(),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
});

export const uploadJobs = pgTable("upload_jobs", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  fileName: text("file_name").notNull(),
  description: text("description"),
  region: varchar("region", { length: 10 }).notNull(),
  status: varchar("status", { length: 50 }).default('Pending').notNull(),
  jobId: text("job_id").notNull().unique(),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
});

// --- Drizzle Relations ---
export const adminRequestsRelations = relations(adminRequests, ({ many }) => ({
  comments: many(requestComments),
}));

export const requestCommentsRelations = relations(requestComments, ({ one }) => ({
  adminRequest: one(adminRequests, {
    fields: [requestComments.requestId],
    references: [adminRequests.id],
  }),
}));

export const apiUsageRelations = relations(apiUsage, ({ one }) => ({
  user: one(users, {
    fields: [apiUsage.userId],
    references: [users.id],
  }),
}));

export const USER_ROLES = {
  BUSINESS_ADMIN: 'business_admin',
  CLIENT_ADMIN: 'client_admin',
  USER: 'user',
} as const;

// --- Type Exports ---
export type User = typeof users.$inferSelect;
export type AuthAccount = typeof accounts.$inferSelect;
export type NewAuthAccount = typeof accounts.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
export type VerificationToken = typeof verificationTokens.$inferSelect;
export type NewVerificationToken = typeof verificationTokens.$inferInsert;
export type EmailVerificationToken = typeof emailVerificationTokens.$inferSelect;
export type NewEmailVerificationToken = typeof emailVerificationTokens.$inferInsert;
export type NewUser = typeof users.$inferInsert;
export type ApiKey = typeof apiKeys.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
export type CreditTransaction = typeof creditTransactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;
export type ApiUsage = typeof apiUsage.$inferSelect;
export type CreditBundle = typeof creditBundles.$inferSelect;
export type NewCreditBundle = typeof creditBundles.$inferInsert;
export type DiscountCode = typeof discountCodes.$inferSelect;
export type NewDiscountCode = typeof discountCodes.$inferInsert;
export type SubscriptionPlan = typeof subscriptionPlans.$inferSelect;
export type NewSubscriptionPlan = typeof subscriptionPlans.$inferInsert;
export type UserSubscription = typeof userSubscriptions.$inferSelect;
export type NewUserSubscription = typeof userSubscriptions.$inferInsert;
export type NewApiUsage = typeof apiUsage.$inferInsert;
export type UploadJob = typeof uploadJobs.$inferSelect;
export type NewUploadJob = typeof uploadJobs.$inferInsert;
export type AdminRequest = typeof adminRequests.$inferSelect;
export type NewAdminRequest = typeof adminRequests.$inferInsert;
export type RequestComment = typeof requestComments.$inferSelect;
export type NewRequestComment = typeof requestComments.$inferInsert;

