import { NextResponse, type NextRequest } from 'next/server';
import { db } from "@/lib/drizzle"; // 1. Use the Drizzle db instance
import { users, emailVerificationTokens } from '@/shared/schema';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { Resend } from 'resend';

// Initialize Resend client, ensuring it only happens once
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// This is the final, unified API route for user registration.
export async function POST(req: NextRequest) {
  try {
    const { firstName, lastName, email, password, company, website } = await req.json();
    
    if (!firstName || !lastName || !email || !password || !company) {
      return NextResponse.json({ message: 'First name, last name, email, password, and company are required.' }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ message: 'Password must be at least 8 characters.' }, { status: 400 });
    }
    
    const hashedPassword = await bcrypt.hash(password, 12);
    const verificationToken = randomBytes(32).toString('hex');
    const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24-hour expiry
    
    let newUserId: number;

    // 2. Use a Drizzle transaction for data integrity
    await db.transaction(async (tx) => {
        const newUserResult = await tx.insert(users).values({
            firstName,
            lastName,
            email,
            password: hashedPassword,
            company,
            website: website || null,
            emailVerified: false,
        }).returning({ id: users.id });

        if (newUserResult.length === 0) {
            throw new Error("Failed to create user.");
        }
        newUserId = newUserResult[0].id;

        await tx.insert(emailVerificationTokens).values({
            userId: newUserId,
            token: verificationToken,
            expiresAt: tokenExpiry.toISOString(),
        });
    });
    
    // 3. Send the verification email after the database transaction is successful
    if (resend) {
      const verificationUrl = `${process.env.APP_BASE_URL || 'http://localhost:3001'}/api/verify-email/${verificationToken}`;
      resend.emails.send({
        from: process.env.EMAIL_FROM || 'noreply@datazag.com',
        to: email,
        subject: 'Verify your email address - Datazag',
        html: `<h1>Welcome, ${firstName}!</h1><p>Please click the link below to verify your email address:</p><a href="${verificationUrl}">Verify Email</a>`,
      }).catch(err => console.error("Failed to send verification email:", err));
    }
    
    return NextResponse.json({
      message: 'Registration successful. Please check your email to verify your account.',
    }, { status: 201 });
    
  } catch (error: any) {
    console.error('Registration error:', error);
    // Drizzle throws errors with a 'code' property for unique constraint violations
    if (error?.code === '23505') {
      return NextResponse.json({ message: 'An account with this email already exists.' }, { status: 409 });
    }
    return NextResponse.json({ message: 'Server error during registration.' }, { status: 500 });
  }
}