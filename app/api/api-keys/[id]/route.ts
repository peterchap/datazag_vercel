import { NextResponse, type NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/drizzle';
import { apiKeys } from '@/shared/schema';
import { eq, and } from 'drizzle-orm';
import { redisSyncService } from '@/lib/redis-sync-client';

/**
 * DELETE /api/api-keys/:id
 * Deletes a specific API key belonging to the authenticated user.
 */
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const params = await context.params;
    const keyIdToDelete = parseInt(params.id, 10); // API key ID is still integer (serial)
    const userId = session.user.id; // User ID is now string

    // First, find the key to ensure it belongs to the user and to get its value for Redis
    const keyToDelete = await db.query.apiKeys.findFirst({
        where: and(eq(apiKeys.id, keyIdToDelete), eq(apiKeys.userId, userId))
    });

    if (!keyToDelete) {
        return NextResponse.json({ error: 'API key not found or you do not have permission to delete it.' }, { status: 404 });
    }

    // Delete the key from the database
    await db.delete(apiKeys).where(eq(apiKeys.id, keyIdToDelete));
    
    // Remove the key from Redis cache with better error handling
    try {
      await redisSyncService.deleteApiKey(keyToDelete.key);
      console.log(`[Redis Sync] Successfully deleted API key from Redis: ${keyToDelete.key}`);
    } catch (redisError) {
      console.error(`[Redis Sync Error] Failed to delete API key from Redis: ${keyToDelete.key}`, redisError);
      // Continue with success response since database deletion succeeded
    }

    return NextResponse.json({ success: true, message: 'API key deleted successfully.' });

  } catch (error) {
    console.error('Delete API key error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}