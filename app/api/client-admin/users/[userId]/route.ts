import { NextResponse, type NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/drizzle';
import { users, creditTransactions, emailVerificationTokens } from '@/shared/schema';
import { eq, and } from 'drizzle-orm';

export async function DELETE(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const userId = parseInt(params.userId);
    if (isNaN(userId)) {
      return NextResponse.json({ message: 'Invalid user ID' }, { status: 400 });
    }

    // Verify admin is authorized
    if (!session.user.email) {
      return NextResponse.json({ message: 'Invalid session: missing email' }, { status: 400 });
    }
    const adminUser = await db.query.users.findFirst({
      where: eq(users.email, session.user.email.toLowerCase())
    });

    if (!adminUser || adminUser.role !== 'client_admin') {
      return NextResponse.json({ message: 'Admin access required' }, { status: 403 });
    }

    // Find the target user and verify they're in the same company
    const targetUser = await db.query.users.findFirst({
      where: eq(users.id, userId.toString())
    });

    if (!targetUser) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    if (targetUser.company !== adminUser.company) {
      return NextResponse.json({ message: 'Can only delete users in your company' }, { status: 403 });
    }

    // Prevent admin from deleting themselves
    if (targetUser.id === adminUser.id) {
      return NextResponse.json({ message: 'Cannot delete your own account' }, { status: 400 });
    }

    await db.transaction(async (tx) => {
  // Return user's credits to admin (company pool)
  const adminUser = await tx.query.users.findFirst({
    where: and(
      eq(users.company, targetUser.company),
      eq(users.role, 'client_admin')
    )
  });

  if (adminUser && targetUser.credits > 0) {
    await tx.update(users)
      .set({ 
        credits: adminUser.credits + targetUser.credits,
        lastLogin: new Date().toISOString()
      })
      .where(eq(users.id, adminUser.id));

    // Record the credit return transaction
    await tx.insert(creditTransactions).values({
      userId: adminUser.id,
      amount: targetUser.credits,
      type: 'refund',
      description: `Credits returned from deleted user ${targetUser.firstName} ${targetUser.lastName}`,
      createdAt: new Date().toISOString()
    });
  }

  // Delete related records first
  await tx.delete(creditTransactions).where(eq(creditTransactions.userId, userId.toString()));
  await tx.delete(emailVerificationTokens).where(eq(emailVerificationTokens.userId, userId.toString()));
  
  // Delete the user
  await tx.delete(users).where(eq(users.id, userId.toString()));
})

    return NextResponse.json({ 
      message: 'User deleted successfully',
      returnedCredits: targetUser.credits
    });

  } catch (error) {
    console.error('Delete user error:', error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

// Optional: GET endpoint to fetch single user details
export async function GET(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const userId = parseInt(params.userId);
    if (isNaN(userId)) {
      return NextResponse.json({ message: 'Invalid user ID' }, { status: 400 });
    }

    // Verify admin is authorized
    if (!session.user.email) {
      return NextResponse.json({ message: 'Invalid session: missing email' }, { status: 400 });
    }
    const adminUser = await db.query.users.findFirst({
      where: eq(users.email, session.user.email.toLowerCase())
    });

    if (!adminUser || adminUser.role !== 'client_admin') {
      return NextResponse.json({ message: 'Admin access required' }, { status: 403 });
    }

    // Find the target user
    const targetUser = await db.query.users.findFirst({
      where: and(
        eq(users.id, userId.toString()),
        eq(users.company, adminUser.company)
      )
    });

    if (!targetUser) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    // Get user's credit usage
    const transactions = await db.query.creditTransactions.findMany({
      where: eq(creditTransactions.userId, userId.toString())
    });

    const creditsUsed = transactions
      .filter(t => t.type === 'usage')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    return NextResponse.json({
      id: targetUser.id,
      firstName: targetUser.firstName,
      lastName: targetUser.lastName,
      email: targetUser.email,
      role: targetUser.role,
      credits: targetUser.credits,
      creditsUsed,
      canPurchaseCredits: targetUser.canPurchaseCredits,
      createdAt: targetUser.createdAt,
      lastLogin: targetUser.lastLogin
    });

  } catch (error) {
    console.error('Get user error:', error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}