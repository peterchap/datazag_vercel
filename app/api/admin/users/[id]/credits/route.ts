import { NextResponse, type NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { USER_ROLES } from '@/shared/schema';
import { db } from '@/lib/drizzle';
import { users, transactions } from '@/shared/schema';
import { eq, sql } from 'drizzle-orm';
import { redisSyncService } from '@/lib/redis-sync-client';

export async function POST(
  req: NextRequest,
  context: { params: { id: string } }
) {
  const session = await auth();

  if (!session?.user || (session.user.role !== USER_ROLES.BUSINESS_ADMIN && session.user.role !== USER_ROLES.CLIENT_ADMIN)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { id: userId } = context.params; // This is now a string (text ID)
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
        status: 'completed',
    } as any);
    // Updated to use the new Redis sync method
    redisSyncService.updateApiKeyCredits(userId, newBalance)
      .then(results => {
        // Assuming results.data is the array of sync results
        interface RedisSyncResult {
          success: boolean;
          message?: string;
        }

        const syncResults = (results as any).data as RedisSyncResult[] || [];
        const successCount: number = syncResults.filter((r: RedisSyncResult) => r.success).length;
        const totalKeys = syncResults.length;
        console.log(`[Redis Sync] Successfully synced credits for ${successCount}/${totalKeys} API keys for user ${userId}.`);

        syncResults.forEach((result: RedisSyncResult, index: number) => {
          if (!result.success) {
            console.error(`[Redis Sync Failed] API key ${index} for user ${userId}:`, result.message);
          }
        });
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