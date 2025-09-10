import { NextResponse, type NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/drizzle';
import { apiKeys } from '@/shared/schema';
import { eq, and } from 'drizzle-orm';
import { redisSyncService } from '@/lib/redis-sync-client';

/**
 * DELETE /api/api-keys/:id
 * Deletes a specific API key belonging to the authenticated user.
 * The function signature is updated to correctly handle the params promise.
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
    // We now correctly await the promise to get the params object.
    const params = await context.params;
    const keyIdToDelete = parseInt(params.id, 10);
    const userId = parseInt(session.user.id, 10);

    // First, find the key to ensure it belongs to the user and to get its value for Redis
    const keyToDelete = await db.query.apiKeys.findFirst({
        where: and(eq(apiKeys.id, keyIdToDelete), eq(apiKeys.userId, userId))
    });

    if (!keyToDelete) {
        return NextResponse.json({ error: 'API key not found or you do not have permission to delete it.' }, { status: 404 });
    }

    // Delete the key from the database
    await db.delete(apiKeys).where(eq(apiKeys.id, keyIdToDelete));
    
    // Asynchronously remove the key from the Redis cache
    redisSyncService.deleteApiKey(keyToDelete.key).catch(err => console.error("Redis sync failed for API key deletion:", err));

    return NextResponse.json({ success: true, message: 'API key deleted successfully.' });

  } catch (error) {
    console.error('Delete API key error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}