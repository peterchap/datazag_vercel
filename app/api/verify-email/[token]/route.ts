import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/drizzle';
import { users, emailVerificationTokens } from '@/shared/schema';
import { and, eq, gte, sql } from 'drizzle-orm';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  try {
    // We now correctly await the promise to get the params object.
    const params = await context.params;
    const { token } = params;
    const appBaseUrl = process.env.APP_BASE_URL || 'http://localhost:3001';

    const verification = await db.query.emailVerificationTokens.findFirst({
        where: and(
            eq(emailVerificationTokens.token, token),
            eq(emailVerificationTokens.used, false),
            gte(emailVerificationTokens.expiresAt, sql`now()`)
        )
    });

    if (!verification) {
        throw new Error('Invalid or expired token');
    }
    
    await db.transaction(async (tx) => {
        await tx.update(users).set({ emailVerified: new Date() }).where(eq(users.id, verification.userId));
        await tx.update(emailVerificationTokens).set({ used: true }).where(eq(emailVerificationTokens.id, verification.id));
    });
    
    return NextResponse.redirect(`${appBaseUrl}/login?verified=true`);
  } catch (error) {
    console.error('Verification error:', error);
    const appBaseUrl = process.env.APP_BASE_URL || 'http://localhost:3001';
    return NextResponse.redirect(`${appBaseUrl}/register?error=verification-failed`);
  }
}