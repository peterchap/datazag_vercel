import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/drizzle';
import { users, emailVerificationTokens } from '@/shared/schema';
import { and, eq, gte } from 'drizzle-orm';

// This is the final, unified API route for handling email verification links.
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  try {
    const params = await context.params;
    const { token } = params;
    const appBaseUrl = process.env.APP_BASE_URL || 'http://localhost:3001';

    // 1. Find a valid, non-expired token in the database using Drizzle.
    const verification = await db.query.emailVerificationTokens.findFirst({
        where: and(
            eq(emailVerificationTokens.token, token),
            eq(emailVerificationTokens.used, false),
            gte(emailVerificationTokens.expiresAt, new Date().toISOString())
        )
    });

    if (!verification) {
        throw new Error('Invalid or expired verification token.');
    }
    
    // 2. Use a database transaction to ensure both updates succeed or fail together.
    await db.transaction(async (tx) => {
        // Mark the user's email as verified.
        await tx.update(users)
            .set({ emailVerified: new Date() })
            .where(eq(users.id, verification.userId));
        
        // Mark the token as used to prevent it from being used again.
        await tx.update(emailVerificationTokens)
            .set({ used: true })
            .where(eq(emailVerificationTokens.id, verification.id));
    });
    
    // 3. On success, redirect the user to the login page with a success message.
    return NextResponse.redirect(`${appBaseUrl}/login?verified=true`);

  } catch (error: any) {
    console.error('Email verification error:', error);
    const appBaseUrl = process.env.APP_BASE_URL || 'http://localhost:3001';
    const errorMessage = encodeURIComponent(error.message || 'Verification failed.');
    return NextResponse.redirect(`${appBaseUrl}/register?error=${errorMessage}`);
  }
}
