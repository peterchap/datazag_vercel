import { NextResponse, type NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/drizzle';
import { users, apiKeys, transactions, adminRequests, requestComments } from '@/shared/schema';
import { eq } from 'drizzle-orm';
import { USER_ROLES } from '@/shared/schema';
import { redisSyncService } from '@/lib/redis-sync-client';

/**
 * GET handler to fetch a single user's details for the admin panel.
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session?.user || (session.user.role !== USER_ROLES.BUSINESS_ADMIN && session.user.role !== USER_ROLES.CLIENT_ADMIN)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const params = await context.params;
    const userId = params.id; // Keep as string, don't parse as integer

    const user = await db.query.users.findFirst({
      where: eq(users.id, userId), // userId is now string
      columns: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        company: true,
        role: true,
        credits: true,
        createdAt: true,
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(user);

  } catch (error) {
    console.error('GET admin user by id error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * DELETE handler to remove a user.
 */
export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || (session.user.role !== USER_ROLES.BUSINESS_ADMIN)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const params = await context.params;
    const userIdToDelete = params.id; // Keep as string
    
    // Compare user IDs as strings
    if (session.user.id === userIdToDelete) {
      return NextResponse.json({ error: "For security, admins cannot delete their own account." }, { status: 400 });
    }

    // Get all API keys for this user
    const userApiKeys = await db.query.apiKeys.findMany({
      where: eq(apiKeys.userId, userIdToDelete), // userIdToDelete is now string
    });

    // Remove the API keys from Redis cache first
    const redisDeletionPromises = userApiKeys.map(key => 
      redisSyncService.deleteApiKey(key.key)
    );
    
    try {
      await Promise.all(redisDeletionPromises);
      console.log(`[Redis Sync] Successfully deleted ${userApiKeys.length} API keys from Redis for user ${userIdToDelete}`);
    } catch (redisError) {
      console.error(`[Redis Sync Error] Failed to delete some API keys from Redis for user ${userIdToDelete}:`, redisError);
      // Continue with database deletion even if Redis fails
    }
    
    // Delete from database in a transaction
    await db.transaction(async (tx) => {
        // Delete all "child" records first to satisfy foreign key constraints.
        await tx.delete(requestComments).where(eq(requestComments.userId, userIdToDelete));
        await tx.delete(adminRequests).where(eq(adminRequests.userId, userIdToDelete));
        await tx.delete(transactions).where(eq(transactions.userId, userIdToDelete));
        await tx.delete(apiKeys).where(eq(apiKeys.userId, userIdToDelete));
        
        // Finally, delete the user record
        await tx.delete(users).where(eq(users.id, userIdToDelete));
    });

    return NextResponse.json({ 
      success: true, 
      message: 'User and all associated data deleted successfully.',
      deletedApiKeys: userApiKeys.length 
    });

  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}