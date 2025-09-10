import { NextResponse, type NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/drizzle';
import { emailVerificationTokens } from '@/shared/schema';
import { randomBytes } from 'crypto';
import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { newEmail } = await req.json();
    if (!newEmail || typeof newEmail !== 'string') {
      return NextResponse.json({ message: 'A valid new email address is required.' }, { status: 400 });
    }

    const verificationToken = randomBytes(32).toString('hex');
    const tokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour expiry

    await db.insert(emailVerificationTokens).values({
      userId: parseInt(session.user.id, 10),
      token: verificationToken,
      expiresAt: tokenExpiry.toISOString(),
      metadata: { newEmail: newEmail, type: 'email_change' }
    });

    const verificationUrl = `${process.env.APP_BASE_URL || 'http://localhost:3001'}/api/verify-email-change/${verificationToken}`;
    
    if (resend) {
      resend.emails.send({
        from: process.env.EMAIL_FROM || 'noreply@datazag.com',
        to: newEmail,
        subject: 'Confirm Your New Email Address for Datazag',
        html: `<h1>Confirm Your Email Change</h1><p>Please click the link below to confirm the change of your email address.</p><a href="${verificationUrl}">Confirm New Email</a><p>This link will expire in one hour.</p>`,
      }).catch(console.error);
    }

    return NextResponse.json({ message: `A verification email has been sent to ${newEmail}.` });
  } catch (error) {
    console.error('Request email change error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}