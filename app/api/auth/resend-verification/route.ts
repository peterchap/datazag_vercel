// app/api/auth/resend-verification/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { randomBytes } from 'crypto';
import { Resend } from 'resend';
import { checkRateLimit, extractClientIP } from '@/lib/rate-limit';
import { 
  findUserByEmail, 
  deleteVerificationTokensForUser, 
  createVerificationToken 
} from '@/lib/db';

const resend = new Resend(process.env.RESEND_API_KEY);

const resendSchema = z.object({
  email: z.string().email("Invalid email address"),
});

function getVerificationEmailHtml(firstName: string, verificationUrl: string) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Verify your email</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; margin-bottom: 30px; }
        .logo { font-size: 24px; font-weight: bold; color: #2563eb; }
        .button { 
          display: inline-block; 
          background-color: #2563eb; 
          color: white; 
          padding: 12px 24px; 
          text-decoration: none; 
          border-radius: 6px;
          margin: 20px 0;
        }
        .footer { margin-top: 30px; font-size: 14px; color: #6b7280; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">DataZag</div>
        </div>
        
        <h1>Welcome to DataZag, ${firstName}!</h1>
        
        <p>Thanks for signing up! To complete your registration and secure your account, please verify your email address by clicking the button below:</p>
        
        <div style="text-align: center;">
          <a href="${verificationUrl}" class="button">Verify Email Address</a>
        </div>
        
        <p>Or copy and paste this link into your browser:</p>
        <p style="background-color: #f3f4f6; padding: 10px; border-radius: 4px; word-break: break-all;">
          ${verificationUrl}
        </p>
        
        <p><strong>This link expires in 24 hours.</strong></p>
        
        <p>After verification, you'll set up two-factor authentication to keep your account extra secure.</p>
        
        <div class="footer">
          <p>If you didn't create an account, you can safely ignore this email.</p>
          <p>Need help? Contact us at support@datazag.com</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = resendSchema.parse(body);

    // Apply rate limiting per email using your existing rate limiter
    const rateLimitKey = `resend:${email}`;
    const rateLimit = checkRateLimit(rateLimitKey, 3, 60 * 60 * 1000); // 3 attempts per hour per email
    
    if (rateLimit.limited) {
      return NextResponse.json(
        { 
          message: 'Too many verification emails sent. Please wait before trying again.',
          resetTime: rateLimit.reset
        },
        { status: 429 }
      );
    }

    // Find user by email
    const user = await findUserByEmail(email);
    if (!user) {
      return NextResponse.json(
        { message: 'No account found with this email address' },
        { status: 404 }
      );
    }

    // Check if already verified
    if (user.emailVerified) {
      return NextResponse.json(
        { message: 'Email is already verified' },
        { status: 400 }
      );
    }

    // Delete any existing verification tokens for this user
    await deleteVerificationTokensForUser(user.id);

    // Generate new verification token
    const verificationToken = randomBytes(32).toString('hex');
    const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // Create new verification token
    await createVerificationToken({
      userId: user.id,
      token: verificationToken,
      expiresAt: tokenExpiry,
    });

    // Send verification email
    const verificationUrl = `${process.env.NEXTAUTH_URL}/api/auth/verify-email/${verificationToken}`;
    
    await resend.emails.send({
      from: process.env.EMAIL_FROM || 'DataZag <noreply@datazag.com>',
      to: email,
      subject: 'Verify your email address - DataZag',
      html: getVerificationEmailHtml(user.firstName, verificationUrl),
    });

    return NextResponse.json({
      message: 'Verification email sent successfully',
    });

  } catch (error) {
    console.error('Resend verification error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: 'Invalid email address' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { message: 'Failed to send verification email' },
      { status: 500 }
    );
  }
};