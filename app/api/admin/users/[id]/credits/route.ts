import { NextResponse, type NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { USER_ROLES } from '@/shared/schema';
import { db } from '@/lib/drizzle';
import { users, transactions } from '@/shared/schema';
import { eq, sql } from 'drizzle-orm';
import { redisSyncService } from '@/lib/redis-sync-client';

// The function signature is updated to correctly handle the params promise.
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session?.user || (session.user.role !== USER_ROLES.BUSINESS_ADMIN && session.user.role !== USER_ROLES.CLIENT_ADMIN)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    // We now correctly await the promise to get the params object.
    const params = await context.params;
    const userId = parseInt(params.id, 10);
    const { amount } = await req.json();

    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    const updatedUser = await db.update(users)
      .set({ credits: sql`${users.credits} + ${amount}` })
      .where(eq(users.id, userId))
      .returning({ newBalance: users.credits });

    if (updatedUser.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const newBalance = updatedUser[0].newBalance;

    await db.insert(transactions).values({
        userId: userId,
        type: 'credit',
        amount: amount,
        description: `Manual credit grant by admin ${session.user.email}`,
        status: 'success',
    });
    
    redisSyncService.updateCredits(userId, newBalance)
      .then(result => {
        if (result.success) {
          console.log(`[Redis Sync] Successfully synced credits for user ${userId}.`);
        } else {
          console.error(`[Redis Sync Failed] for user ${userId}:`, result.message);
        }
      })
      .catch(error => {
        console.error(`[Redis Sync Error] for user ${userId}:`, error);
      });

    return NextResponse.json({ success: true, newBalance: newBalance });

  } catch (error) {
    console.error('Error adding credits:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}