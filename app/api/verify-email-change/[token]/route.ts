import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/drizzle';
import { users, emailVerificationTokens } from '@/shared/schema';
import { and, eq, gte, sql } from 'drizzle-orm';

// The function signature is updated to correctly handle the params promise.
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
            gte(emailVerificationTokens.expiresAt, new Date().toISOString()),
            sql`metadata->>'type' = 'email_change'`
        )
    });

    if (!verification) {
        throw new Error('Invalid or expired verification token.');
    }

    const newEmail = (verification.metadata as any)?.newEmail;
    if (!newEmail) {
        throw new Error('Verification record is missing the new email address.');
    }

    await db.transaction(async (tx) => {
        await tx.update(users).set({ email: newEmail }).where(eq(users.id, verification.userId));
        await tx.update(emailVerificationTokens).set({ used: true }).where(eq(emailVerificationTokens.id, verification.id));
    });
    
    return NextResponse.redirect(`${appBaseUrl}/login?emailChanged=true`);
  } catch (error: any) {
    console.error('Email change verification error:', error);
    const appBaseUrl = process.env.APP_BASE_URL || 'http://localhost:3001';
    const errorMessage = encodeURIComponent(error.message || 'Verification failed.');
    return NextResponse.redirect(`${appBaseUrl}/login?error=${errorMessage}`);
  }
}