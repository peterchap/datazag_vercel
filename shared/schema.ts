import { pgTable, foreignKey, unique, serial, jsonb, integer, text, boolean, timestamp, numeric, json, varchar, index } from "drizzle-orm/pg-core"
import { sql, relations } from "drizzle-orm"

export const users = pgTable("users", {
	id: serial().primaryKey().notNull(),
	firstName: text("first_name").notNull(),
	lastName: text("last_name").notNull(),
	username: text(),
	password: text().notNull(),
	email: text().notNull(),
	company: text().notNull(),
	website: text(),
	companyAddress: text("company_address"),
	credits: integer().default(0).notNull(),
	stripeCustomerId: text("stripe_customer_id"),
	role: text().default('user').notNull(),
	parentUserId: integer("parent_user_id"),
	canPurchaseCredits: boolean("can_purchase_credits").default(true).notNull(),
	gracePeriodEnd: timestamp("grace_period_end", { mode: 'string' }),
	creditThreshold: integer("credit_threshold"),
	active: boolean().default(true).notNull(),
	emailVerified: boolean("email_verified").default(false).notNull(),
	emailVerificationToken: text("email_verification_token"),
	emailVerificationExpires: timestamp("email_verification_expires", { mode: 'string' }),
	passwordResetToken: text("password_reset_token"),
	passwordResetExpires: timestamp("password_reset_expires", { mode: 'string' }),
	lastLogin: timestamp("last_login", { mode: 'string' }),
	failedLoginAttempts: integer("failed_login_attempts").default(0).notNull(),
	accountLocked: boolean("account_locked").default(false).notNull(),
	accountLockedUntil: timestamp("account_locked_until", { mode: 'string' }),
	twoFactorEnabled: boolean("two_factor_enabled").default(false).notNull(),
	twoFactorSecret: text("two_factor_secret"),
	recoveryCodes: text("recovery_codes"),
	// Add backup codes field for our new 2FA system
	backupCodes: text("backup_codes"), // JSON string of hashed backup codes
	googleId: text("google_id"),
	githubId: text("github_id"),
	microsoftId: text("microsoft_id"),
	linkedinId: text("linkedin_id"),
	// Add timestamps if they don't exist
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.parentUserId],
			foreignColumns: [table.id],
			name: "users_parent_user_id_users_id_fk"
		}),
	unique("users_email_unique").on(table.email),
	unique("users_google_id_unique").on(table.googleId),
	unique("users_github_id_unique").on(table.githubId),
	unique("users_microsoft_id_unique").on(table.microsoftId),
	unique("users_linkedin_id_unique").on(table.linkedinId),
	// Add email index for better performance
	index("users_email_idx").on(table.email),
]);

// New email verification tokens table for our enhanced flow
export const emailVerificationTokens = pgTable("email_verification_tokens", {
	id: serial().primaryKey().notNull(),
	token: text().notNull(),
	userId: integer("user_id").notNull(),
	expiresAt: timestamp("expires_at", { mode: 'string' }).notNull(),
	used: boolean().default(false).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	metadata: jsonb("metadata"),
}, (table) => [
	foreignKey({
		columns: [table.userId],
		foreignColumns: [users.id],
		name: "email_verification_tokens_user_id_users_id_fk"
	}).onDelete("cascade"),
	unique("email_verification_tokens_token_unique").on(table.token),
	index("verification_tokens_token_idx").on(table.token),
	index("verification_tokens_user_id_idx").on(table.userId),
]);

export const apiKeys = pgTable("api_keys", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	key: text().notNull(),
	name: text().notNull(),
	active: boolean().default(true).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "api_keys_user_id_users_id_fk"
		}),
	unique("api_keys_key_unique").on(table.key),
]);

export const apiUsage = pgTable("api_usage", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	apiKeyId: integer("api_key_id").notNull(),
	endpoint: text().notNull(),
	queryType: text("query_type").default('unknown').notNull(),
	creditsUsed: integer("credits_used").notNull(),
	status: text().default('success').notNull(),
	responseTime: integer("response_time").default(0),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "api_usage_user_id_users_id_fk"
		}),
	foreignKey({
			columns: [table.apiKeyId],
			foreignColumns: [apiKeys.id],
			name: "api_usage_api_key_id_api_keys_id_fk"
		}),
]);

export const discountCodes = pgTable("discount_codes", {
	id: serial().primaryKey().notNull(),
	code: text().notNull(),
	discountType: text("discount_type").notNull(),
	discountValue: numeric("discount_value").notNull(),
	active: boolean().default(true).notNull(),
	maxUses: integer("max_uses"),
	currentUses: integer("current_uses").default(0).notNull(),
	expiresAt: timestamp("expires_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	minPurchaseAmount: integer("min_purchase_amount").default(0).notNull(),
	maxDiscountAmount: integer("max_discount_amount"),
	description: text(),
	createdByUserId: integer("created_by_user_id"),
}, (table) => [
	foreignKey({
			columns: [table.createdByUserId],
			foreignColumns: [users.id],
			name: "discount_codes_created_by_user_id_users_id_fk"
		}),
	unique("discount_codes_code_unique").on(table.code),
]);

export const transactions = pgTable("transactions", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	type: text().notNull(),
	amount: integer().notNull(),
	description: text().notNull(),
	apiKeyId: integer("api_key_id"),
	status: text().notNull(),
	metadata: json(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "transactions_user_id_users_id_fk"
		}),
	foreignKey({
			columns: [table.apiKeyId],
			foreignColumns: [apiKeys.id],
			name: "transactions_api_key_id_api_keys_id_fk"
		}),
]);

export const creditBundles = pgTable("credit_bundles", {
	id: serial().primaryKey().notNull(),
	name: text().notNull(),
	description: text().notNull(),
	credits: integer().notNull(),
	price: integer().notNull(),
	popular: boolean().default(false),
	currency: text().default('usd'),
});

export const subscriptionPlans = pgTable("subscription_plans", {
	id: serial().primaryKey().notNull(),
	name: text().notNull(),
	description: text(),
	features: text().array(),
	monthlyPrice: integer("monthly_price").notNull(),
	quarterlyPrice: integer("quarterly_price"),
	annualPrice: integer("annual_price"),
	creditsPerMonth: integer("credits_per_month").notNull(),
	maxApiKeys: integer("max_api_keys").notNull(),
	stripePriceIdMonthly: text("stripe_price_id_monthly"),
	stripePriceIdQuarterly: text("stripe_price_id_quarterly"),
	stripePriceIdAnnual: text("stripe_price_id_annual"),
	active: boolean().default(true).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
});

export const userSubscriptions = pgTable("user_subscriptions", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	planId: integer("plan_id").notNull(),
	status: text().notNull(),
	currentPeriodStart: timestamp("current_period_start", { mode: 'string' }).notNull(),
	currentPeriodEnd: timestamp("current_period_end", { mode: 'string' }).notNull(),
	cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false),
	interval: text().notNull(),
	stripeSubscriptionId: text("stripe_subscription_id"),
	paypalSubscriptionId: text("paypal_subscription_id"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "user_subscriptions_user_id_users_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.planId],
			foreignColumns: [subscriptionPlans.id],
			name: "user_subscriptions_plan_id_subscription_plans_id_fk"
		}),
]);

export const adminRequests = pgTable("admin_requests", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	category: varchar("category", { length: 50 }).notNull(), // e.g., 'Bug', 'Enhancement', 'Billing'
  	subject: text("subject").notNull(),
  	description: text("description").notNull(),
	status: varchar({ length: 20 }).default('pending').notNull(),
	adminNotes: text("admin_notes"),
	reviewedBy: integer("reviewed_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "admin_requests_user_id_users_id_fk"
		}),
	foreignKey({
			columns: [table.reviewedBy],
			foreignColumns: [users.id],
			name: "admin_requests_reviewed_by_users_id_fk"
		}),
]);

export const requestComments = pgTable("request_comments", {
  id: serial("id").primaryKey(),
  requestId: integer("request_id").notNull().references(() => adminRequests.id, { onDelete: 'cascade' }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  authorType: varchar("author_type", { length: 50 }).default('user').notNull(), // 'user' or 'admin'
  comment: text("comment").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const adminRequestsRelations = relations(adminRequests, ({ many }) => ({
  // This line says: "An adminRequest can have many comments."
  // Drizzle uses this to build the 'with' query correctly.
  comments: many(requestComments),
}));

export const requestCommentsRelations = relations(requestComments, ({ one }) => ({
  // This defines the other side of the relationship (optional but good practice)
  adminRequest: one(adminRequests, {
    fields: [requestComments.requestId],
    references: [adminRequests.id],
  }),
}));

export const uploadJobs = pgTable("upload_jobs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  fileName: text("file_name").notNull(),
  description: text("description"),
  region: varchar("region", { length: 10 }).notNull(), // e.g., 'US' or 'EU'
  status: varchar("status", { length: 50 }).default('Pending').notNull(), // e.g., 'Pending', 'Processing', 'Completed', 'Failed'
  jobId: text("job_id").notNull().unique(), // The unique ID you pass back to the customer
  createdAt: timestamp("created_at").defaultNow().notNull(),
});


export const USER_ROLES = {
  BUSINESS_ADMIN: 'business_admin', // or whatever you use in your DB
  CLIENT_ADMIN: 'client_admin',     // or whatever you use in your DB  
  USER: 'user',                     // matches your DB default
} as const;

// Types
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type EmailVerificationToken = typeof emailVerificationTokens.$inferSelect;
export type NewEmailVerificationToken = typeof emailVerificationTokens.$inferInsert;
export type ApiKey = typeof apiKeys.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;

export type ApiUsage = typeof apiUsage.$inferSelect;
export type NewApiUsage = typeof apiUsage.$inferInsert;

export type UploadJob = typeof uploadJobs.$inferSelect;
export type NewUploadJob = typeof uploadJobs.$inferInsert;

export type AdminRequest = typeof adminRequests.$inferSelect;
export type NewAdminRequest = typeof adminRequests.$inferInsert;
export type RequestComment = typeof requestComments.$inferSelect;
export type NewRequestComment = typeof requestComments.$inferInsert;
