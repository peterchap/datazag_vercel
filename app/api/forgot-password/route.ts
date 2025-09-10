import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/drizzle';
import { users } from '@/shared/schema';
import { eq } from 'drizzle-orm';
import { Resend } from 'resend';
import { randomBytes } from 'crypto';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email) return NextResponse.json({ message: 'Email is required.' }, { status: 400 });

    const user = await db.query.users.findFirst({ where: eq(users.email, email) });

    if (user) {
      const resetToken = randomBytes(32).toString('hex');
      const tokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour expiry

      await db.update(users)
        .set({ passwordResetToken: resetToken, passwordResetExpires: tokenExpiry.toISOString() })
        .where(eq(users.id, user.id));
      
      const resetUrl = `${process.env.APP_BASE_URL || 'http://localhost:3001'}/reset-password?token=${resetToken}`;
      
      if (resend) {
        resend.emails.send({
            from: process.env.EMAIL_FROM || 'noreply@datazag.com',
            to: user.email,
            subject: 'Your Password Reset Request',
            html: `<h1>Password Reset</h1><p>Click the link below to set a new password:</p><a href="${resetUrl}">Reset Password</a>`,
        }).catch(console.error);
      }
    }
    
    return NextResponse.json({ message: 'If an account with that email exists, a password reset link has been sent.' });
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}