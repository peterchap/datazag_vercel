import { relations } from "drizzle-orm/relations";
import { users, apiKeys, apiUsage, discountCodes, transactions, userSubscriptions, subscriptionPlans, adminRequests } from "./schema";

export const apiKeysRelations = relations(apiKeys, ({one, many}) => ({
	user: one(users, {
		fields: [apiKeys.userId],
		references: [users.id]
	}),
	apiUsages: many(apiUsage),
	transactions: many(transactions),
}));

export const usersRelations = relations(users, ({one, many}) => ({
	apiKeys: many(apiKeys),
	apiUsages: many(apiUsage),
	discountCodes: many(discountCodes),
	transactions: many(transactions),
	userSubscriptions: many(userSubscriptions),
	adminRequests_userId: many(adminRequests, {
		relationName: "adminRequests_userId_users_id"
	}),
	adminRequests_reviewedBy: many(adminRequests, {
		relationName: "adminRequests_reviewedBy_users_id"
	}),
	user: one(users, {
		fields: [users.parentUserId],
		references: [users.id],
		relationName: "users_parentUserId_users_id"
	}),
	users: many(users, {
		relationName: "users_parentUserId_users_id"
	}),
}));

export const apiUsageRelations = relations(apiUsage, ({one}) => ({
	user: one(users, {
		fields: [apiUsage.userId],
		references: [users.id]
	}),
	apiKey: one(apiKeys, {
		fields: [apiUsage.apiKeyId],
		references: [apiKeys.id]
	}),
}));

export const discountCodesRelations = relations(discountCodes, ({one}) => ({
	user: one(users, {
		fields: [discountCodes.createdByUserId],
		references: [users.id]
	}),
}));

export const transactionsRelations = relations(transactions, ({one}) => ({
	user: one(users, {
		fields: [transactions.userId],
		references: [users.id]
	}),
	apiKey: one(apiKeys, {
		fields: [transactions.apiKeyId],
		references: [apiKeys.id]
	}),
}));

export const userSubscriptionsRelations = relations(userSubscriptions, ({one}) => ({
	user: one(users, {
		fields: [userSubscriptions.userId],
		references: [users.id]
	}),
	subscriptionPlan: one(subscriptionPlans, {
		fields: [userSubscriptions.planId],
		references: [subscriptionPlans.id]
	}),
}));

export const subscriptionPlansRelations = relations(subscriptionPlans, ({many}) => ({
	userSubscriptions: many(userSubscriptions),
}));

export const adminRequestsRelations = relations(adminRequests, ({one}) => ({
	user_userId: one(users, {
		fields: [adminRequests.userId],
		references: [users.id],
		relationName: "adminRequests_userId_users_id"
	}),
	user_reviewedBy: one(users, {
		fields: [adminRequests.reviewedBy],
		references: [users.id],
		relationName: "adminRequests_reviewedBy_users_id"
	}),
}));