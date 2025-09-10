import { NextResponse, type NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/drizzle';
import { users, apiKeys } from '@/shared/schema';
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
    const userId = parseInt(params.id, 10);
    if (isNaN(userId)) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    }

    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
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
    const userIdToDelete = parseInt(params.id, 10);
    
    if (parseInt(session.user.id!, 10) === userIdToDelete) {
      return NextResponse.json({ error: "For security, admins cannot delete their own account." }, { status: 400 });
    }

    const userApiKeys = await db.query.apiKeys.findMany({
      where: eq(apiKeys.userId, userIdToDelete),
    });

    const redisDeletionPromises = userApiKeys.map(key => 
      redisSyncService.deleteApiKey(key.key)
    );
    await Promise.all(redisDeletionPromises);
    
    await db.delete(users).where(eq(users.id, userIdToDelete));

    return NextResponse.json({ success: true, message: 'User and all associated data deleted successfully.' });

  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}