import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/drizzle';
import { users } from '@/shared/schema';
import { eq } from 'drizzle-orm';
import { Resend } from 'resend';
import { randomBytes } from 'crypto';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    
    if (!email) {
      return NextResponse.json({ message: 'Email is required.' }, { status: 400 });
    }

    console.log('Looking for user with email:', email.toLowerCase());

    // Find user (same pattern as register)
    const user = await db.query.users.findFirst({
      where: eq(users.email, email.toLowerCase()),
    });

    if (!user) {
      console.log('User not found');
      // Return success anyway for security
      return NextResponse.json({ 
        message: 'If an account with that email exists, a password reset link has been sent.' 
      });
    }

    console.log('User found:', user.id);

    const resetToken = randomBytes(32).toString('hex');
    const tokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    console.log('Generated token:', resetToken);
    console.log('Token expiry:', tokenExpiry.toISOString());

    // Update user with reset token - use exact same pattern as register script
    const updateResult = await db
      .update(users)
      .set({
        passwordResetToken: resetToken,
        passwordResetExpires: tokenExpiry.toISOString(),
        lastLogin: new Date().toISOString(),
      })
      .where(eq(users.email, email.toLowerCase()))
      .returning();

    console.log('Update result:', updateResult);

    if (updateResult.length === 0) {
      console.log('No rows updated');
      return NextResponse.json({ message: 'Failed to update user' }, { status: 500 });
    }

    // Send email (same pattern as register)
    const apiKey = process.env.RESEND_API_KEY;
    if (apiKey) {
      const resend = new Resend(apiKey);
      const baseUrl = process.env.APP_BASE_URL || 'http://localhost:3001';
      const resetUrl = `${baseUrl}/reset-password?token=${resetToken}`;
      
      console.log('Sending email to:', user.email);
      
      try {
        await resend.emails.send({
          from: process.env.EMAIL_FROM || 'noreply@datazag.com',
          to: user.email,
          subject: 'Password Reset Request - Datazag',
          html: `
            <h1>Password Reset</h1>
            <p>You requested a password reset for your Datazag account.</p>
            <p>Click the link below to reset your password:</p>
            <a href="${resetUrl}">Reset Password</a>
            <p>This link will expire in 1 hour.</p>
            <p>If you didn't request this, please ignore this email.</p>
          `
        });
        console.log('Password reset email sent successfully');
      } catch (emailError) {
        console.error('Failed to send reset email:', emailError);
      }
    } else {
      console.log('No RESEND_API_KEY found');
    }
    
    return NextResponse.json({ 
      message: 'If an account with that email exists, a password reset link has been sent.' 
    });
    
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json({ 
      message: 'Server error occurred',
      error: process.env.NODE_ENV === 'development' ? String(error) : undefined 
    }, { status: 500 });
  }
}