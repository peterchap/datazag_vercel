import { NextResponse, type NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/drizzle';
import { users, apiKeys } from '@/shared/schema';
import { eq } from 'drizzle-orm';
import { redisSyncService } from '@/lib/redis-sync-client';
import { randomBytes } from 'crypto';

/**
 * GET /api/api-keys
 * Fetches all API keys for the currently authenticated user.
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const userApiKeys = await db.query.apiKeys.findMany({
      where: eq(apiKeys.userId, parseInt(session.user.id, 10)),
      orderBy: (apiKeys, { desc }) => [desc(apiKeys.createdAt)],
    });

    // Mask the keys for security before sending to the client
    const maskedKeys = userApiKeys.map(key => ({
      ...key,
      key: `datazag...${key.key.slice(-8)}`,
    }));

    return NextResponse.json(maskedKeys);
  } catch (error) {
    console.error('Get API keys error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * POST /api/api-keys
 * Creates a new API key for the currently authenticated user.
 */
export async function POST(req: NextRequest) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { name } = await req.json();
        if (!name) {
            return NextResponse.json({ message: 'API key name is required' }, { status: 400 });
        }

        const key = `datazag_${randomBytes(16).toString('hex')}`;
        
        const newUserKey = await db.insert(apiKeys).values({
            userId: parseInt(session.user.id, 10),
            key,
            name,
            active: true,
        }).returning();

        const userCredits = session.user.credits || 0;
        
        // Asynchronously sync the new key with Redis
        redisSyncService.registerApiKey({
            key: key,
            user_id: parseInt(session.user.id, 10),
            credits: userCredits,
            active: true,
        }).catch(err => console.error("Redis sync failed for new API key:", err));

        return NextResponse.json(newUserKey[0], { status: 201 });

    } catch (error) {
        console.error('Create API key error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
