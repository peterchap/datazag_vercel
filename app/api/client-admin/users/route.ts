import { NextResponse, type NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/drizzle';
import { users, creditTransactions } from '@/shared/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { Resend } from 'resend';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const bodyText = await req.text();
    const { firstName, lastName, email, role, initialCredits } = JSON.parse(bodyText);

    // Validation
    if (!firstName || !lastName || !email) {
      return NextResponse.json({ message: 'First name, last name, and email are required' }, { status: 400 });
    }

    if (role && !['client_user', 'client_admin'].includes(role)) {
      return NextResponse.json({ message: 'Invalid role' }, { status: 400 });
    }

    const creditsToAllocate = parseInt(initialCredits) || 0;

    // Verify admin is authorized
    if (!session.user.email) {
      return NextResponse.json({ message: 'User email not found in session' }, { status: 400 });
    }
    const adminUser = await db.query.users.findFirst({
      where: eq(users.email, session.user.email.toLowerCase())
    });

    if (!adminUser || adminUser.role !== 'client_admin') {
      return NextResponse.json({ message: 'Admin access required' }, { status: 403 });
    }

    // Check if user already exists
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, email.toLowerCase())
    });

    if (existingUser) {
      return NextResponse.json({ message: 'User with this email already exists' }, { status: 409 });
    }

    // Check available credits if allocating initial credits
    if (creditsToAllocate > 0) {
      const companyUsers = await db.query.users.findMany({
        where: eq(users.company, adminUser.company)
      });

      const totalCompanyCredits = companyUsers.reduce((sum, user) => sum + (user.creditsPurchased || 0), 0);
      const totalAllocatedCredits = companyUsers.reduce((sum, user) => sum + user.credits, 0);
      const availableCredits = totalCompanyCredits - totalAllocatedCredits;

      if (creditsToAllocate > availableCredits) {
        return NextResponse.json({ 
          message: 'Insufficient company credits for initial allocation',
          available: availableCredits,
          requested: creditsToAllocate
        }, { status: 400 });
      }
    }

    // Generate temporary password
    const tempPassword = randomBytes(12).toString('hex');
    const hashedPassword = await bcrypt.hash(tempPassword, 12);

    let newUserId: string | undefined = undefined;

    // Create user in transaction
    await db.transaction(async (tx) => {
      const newUserResult = await tx.insert(users).values({
        firstName,
        lastName,
        email: email.toLowerCase(),
        password: hashedPassword,
        company: adminUser.company,
        website: adminUser.website,
        role: role || 'client_user',
        credits: creditsToAllocate,
        canPurchaseCredits: false,
        emailVerified: null, // User will need to verify email
        createdAt: new Date().toISOString()
      }).returning({ id: users.id });

      if (newUserResult.length === 0) {
        throw new Error("Failed to create user.");
      }
      
      newUserId = newUserResult[0].id;

      // Record initial credit allocation if any
      if (creditsToAllocate > 0) {
        await tx.insert(creditTransactions).values({
          userId: newUserId,
          amount: creditsToAllocate,
          type: 'allocation',
          description: `Initial credits allocated during user creation by ${adminUser.firstName} ${adminUser.lastName}`,
          createdAt: new Date().toISOString()
        });
      }
    });

    if (!newUserId) {
      return NextResponse.json({ message: 'User creation failed' }, { status: 500 });
    }

    // Send welcome email with temporary password
    const apiKey = process.env.RESEND_API_KEY;
    if (apiKey) {
      try {
        const resend = new Resend(apiKey);
        const baseUrl = process.env.APP_BASE_URL || 'http://localhost:3001';
        
        await resend.emails.send({
          from: process.env.EMAIL_FROM || 'noreply@datazag.com',
          to: email,
          subject: 'Welcome to Datazag - Account Created',
          html: `
            <h1>Welcome to Datazag, ${firstName}!</h1>
            <p>Your account has been created by your company administrator.</p>
            
            <h2>Login Details:</h2>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Temporary Password:</strong> ${tempPassword}</p>
            
            <p><strong>Important:</strong> Please log in and change your password immediately.</p>
            <a href="${baseUrl}/login" style="background-color: #007cba; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 10px 0;">
              Login to Your Account
            </a>
            
            ${creditsToAllocate > 0 ? `<p>You have been allocated ${creditsToAllocate} credits to get started.</p>` : ''}
            
            <hr>
            <small>This email was sent from Datazag Customer Portal</small>
          `
        });
        console.log('Welcome email sent to new user');
      } catch (emailError) {
        console.error('Failed to send welcome email:', emailError);
        // Don't fail the user creation if email fails
      }
    }

    return NextResponse.json({
      message: 'User created successfully',
      user: {
        id: newUserId,
        firstName,
        lastName,
        email,
        role: role || 'client_user',
        credits: creditsToAllocate,
        creditsUsed: 0,
        canPurchaseCredits: false
      },
      tempPassword // In production, you might not want to return this
    }, { status: 201 });

  } catch (error) {
    console.error('Create user error:', error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

// GET endpoint to fetch all company users (update existing if you have one)
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Verify admin is authorized
    if (!session.user.email) {
      return NextResponse.json({ message: 'User email not found in session' }, { status: 400 });
    }
    const adminUser = await db.query.users.findFirst({
      where: eq(users.email, session.user.email.toLowerCase())
    });

    if (!adminUser || adminUser.role !== 'client_admin') {
      return NextResponse.json({ message: 'Admin access required' }, { status: 403 });
    }

    // Get all users in the same company
    const companyUsers = await db.query.users.findMany({
      where: eq(users.company, adminUser.company)
    });

    // Get credit usage for each user
    const usersWithUsage = await Promise.all(
      companyUsers.map(async (user) => {
        const transactions = await db.query.creditTransactions.findMany({
          where: eq(creditTransactions.userId, user.id)
        });

        const creditsUsed = transactions
          .filter(t => t.type === 'usage')
          .reduce((sum, t) => sum + Math.abs(t.amount), 0);

        return {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role,
          credits: user.credits,
          creditsUsed,
          canPurchaseCredits: user.canPurchaseCredits,
          createdAt: user.createdAt,
          lastLogin: user.lastLogin
        };
      })
    );

    return NextResponse.json(usersWithUsage);

  } catch (error) {
    console.error('Get users error:', error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}