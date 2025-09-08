import { Pool } from 'pg';
import { eq, and, lt } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { users, emailVerificationTokens, type User, type EmailVerificationToken } from '@/shared/schema';

declare global {
  // eslint-disable-next-line no-var
  var __datazag_pool__: Pool | undefined;
}
// Reuse a singleton pool across hot reloads in dev
const pool =
  global.__datazag_pool__ ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

if (process.env.NODE_ENV !== 'production') {
  global.__datazag_pool__ = pool;
}

export const db = drizzle(pool);
export { pool };

// Email verification token functions
export async function createVerificationToken(tokenData: {
  userId: number;
  token: string;
  expiresAt: Date;
}): Promise<void> {
  await db.insert(emailVerificationTokens).values(tokenData);
}

export async function findVerificationToken(token: string): Promise<(EmailVerificationToken & { user: User }) | null> {
  const result = await db
    .select({
      id: emailVerificationTokens.id,
      token: emailVerificationTokens.token,
      userId: emailVerificationTokens.userId,
      expiresAt: emailVerificationTokens.expiresAt,
      used: emailVerificationTokens.used,
      createdAt: emailVerificationTokens.createdAt,
      user: users,
    })
    .from(emailVerificationTokens)
    .innerJoin(users, eq(emailVerificationTokens.userId, users.id))
    .where(and(
      eq(emailVerificationTokens.token, token),
      eq(emailVerificationTokens.used, false)
    ))
    .limit(1);

  if (result.length === 0) return null;

  const row = result[0];
  return {
    id: row.id,
    token: row.token,
    userId: row.userId,
    expiresAt: row.expiresAt,
    used: row.used,
    createdAt: row.createdAt,
    user: row.user,
  };
}

export async function markUserAsVerified(userId: number): Promise<void> {
  await db
    .update(users)
    .set({ 
      emailVerified: true,
      updatedAt: new Date()
    })
    .where(eq(users.id, userId));
}

export async function deleteVerificationToken(token: string): Promise<void> {
  await db
    .delete(emailVerificationTokens)
    .where(eq(emailVerificationTokens.token, token));
}

export async function deleteVerificationTokensForUser(userId: number): Promise<void> {
  await db
    .delete(emailVerificationTokens)
    .where(eq(emailVerificationTokens.userId, userId));
}

export async function updateUserEmail(userId: number, newEmail: string): Promise<void> {
  await db
    .update(users)
    .set({ 
      email: newEmail,
      emailVerified: false, // Reset verification status
      updatedAt: new Date()
    })
    .where(eq(users.id, userId));
}

export async function findUserByEmail(email: string): Promise<User | null> {
  const result = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
    
  return result[0] || null;
}

export async function checkUserExists(email: string): Promise<boolean> {
  const result = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  
  return result.length > 0;
}

// Cleanup expired tokens (run this periodically)
export async function cleanupExpiredTokens(): Promise<void> {
  await db
    .delete(emailVerificationTokens)
    .where(lt(emailVerificationTokens.expiresAt, new Date()));
}

export async function runTokenCleanup() {
  try {
    await cleanupExpiredTokens();
    console.log('Cleaned up expired verification tokens');
  } catch (error) {
    console.error('Failed to cleanup expired tokens:', error);
  }
}
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type EmailVerificationToken = typeof emailVerificationTokens.$inferSelect;
