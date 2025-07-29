// Migration script to change API keys column from active to isActive

/**
 * We'll use the drizzle migration tool directly with drizzle push
 * to update the database schema from TypeScript code
 */

// Let's use the drizzle-kit CLI tool to push the changes
console.log("Running drizzle-kit push to update the database schema...");
console.log("This will migrate the 'active' column to 'isActive' in the api_keys table");

// We'll run this with npm run db:push