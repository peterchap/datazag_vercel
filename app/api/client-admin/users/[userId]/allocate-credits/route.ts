import { NextResponse, type NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/drizzle';
import { users, creditTransactions } from '@/shared/schema';
import { eq, and } from 'drizzle-orm';

export async function POST(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
   console.log('=== ALLOCATE CREDITS ENDPOINT HIT ===');
  console.log('UserID from params:', params.userId);
  
  try {
    console.log('Getting session...');
    const session = await auth();
    console.log('Session:', session?.user?.email);
    
    if (!session?.user) {
      console.log('No session - returning 401');
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    console.log('Reading request body...');
    const bodyText = await req.text();
    console.log('Raw body:', bodyText);
    
    const { amount } = JSON.parse(bodyText);
    console.log('Parsed amount:', amount);

    if (!amount || amount <= 0) {
      return NextResponse.json({ message: 'Valid amount is required' }, { status: 400 });
    }

   const userId = params.userId;
  if (!userId) {
    return NextResponse.json({ message: 'Invalid user ID' }, { status: 400 });
  }

    // Verify admin is authorized to manage this user
    const adminUser = await db.query.users.findFirst({
      where: eq(users.email, (session.user.email ?? '').toLowerCase())
    });

    if (!adminUser || adminUser.role !== 'client_admin') {
      return NextResponse.json({ message: 'Admin access required' }, { status: 403 });
    }

    // Find the target user and verify they're in the same company
    const targetUser = await db.query.users.findFirst({
      where: eq(users.id, userId)
    });

    if (!targetUser) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    if (targetUser.company !== adminUser.company) {
      return NextResponse.json({ message: 'Can only manage users in your company' }, { status: 403 });
    }

    // Use admin's credits as company pool (Option 1)
    const availableCredits = adminUser.credits;

    console.log('Credit allocation attempt:', {
      adminCredits: adminUser.credits,
      requestedAmount: amount,
      targetUser: `${targetUser.firstName} ${targetUser.lastName}`,
      currentTargetCredits: targetUser.credits
    });

    if (amount > availableCredits) {
      return NextResponse.json({ 
        message: `Insufficient company credits. Available: ${availableCredits}, Requested: ${amount}`,
        available: availableCredits,
        requested: amount
      }, { status: 400 });
    }

    // Perform the credit allocation in a transaction
    await db.transaction(async (tx) => {
      // Add credits to target user
      await tx.update(users)
        .set({ 
          credits: targetUser.credits + amount,
          lastLogin: new Date().toISOString()
        })
        .where(eq(users.id, userId));;

      // Subtract credits from admin (company pool)
      await tx.update(users)
        .set({ 
          credits: adminUser.credits - amount,
          lastLogin: new Date().toISOString()
        })
        .where(eq(users.id, adminUser.id));

      // Record the transaction for both users
      await tx.insert(creditTransactions).values([
        {
          userId: userId,
          amount: amount,
          type: 'allocation',
          description: `Credits allocated by admin ${adminUser.firstName} ${adminUser.lastName}`,
          createdAt: new Date().toISOString()
        },
        {
          userId: adminUser.id,
          amount: -amount,
          type: 'allocation',
          description: `Credits allocated to ${targetUser.firstName} ${targetUser.lastName}`,
          createdAt: new Date().toISOString()
        }
      ]);
    });

    return NextResponse.json({ 
      message: 'Credits allocated successfully',
      amount: amount,
      newBalance: targetUser.credits + amount
    });

  } catch (error) {
    console.error('Allocate credits error:', error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}