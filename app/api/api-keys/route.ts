import { NextResponse, type NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/drizzle';
import {  apiKeys } from '@/shared/schema';
import { eq } from 'drizzle-orm';
import { redisSyncService } from '@/lib/redis-sync-client';
import { nanoid } from 'nanoid';

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
      where: eq(apiKeys.userId, session.user.id), // Remove parseInt - user ID is now string
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

    const body = await req.json();
    const { name } = body;

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const newApiKey = `datazag_${nanoid(32)}`;

    // ✅ CREATE THE CORRECT RECORD FOR THE REDIS PROXY
    const apiKeyRecord = {
      api_key: newApiKey,
      user_id: session.user.id,
      credits: session.user.credits ?? 0, // Get credits from session, default to 0
      active: true,
    }; 

    console.log('[API Route] Sending this record to Redis Sync:', apiKeyRecord);

    try {
    await redisSyncService.registerApiKey(apiKeyRecord);
  } catch (error: any) {
    console.error('[Redis Sync Error] Failed to register API key:', newApiKey, error);
    return NextResponse.json({ error: `Failed to sync API key with Redis: ${error.message}` }, { status: 500 });
  }

  // Your existing logic to save the key to your own Postgres database is still correct
  const createdApiKey = await db.insert(apiKeys).values({
    key: newApiKey,
    name, // The 'name' is saved here, in your main DB
    userId: session.user.id,
  }).returning();

  return NextResponse.json(createdApiKey[0], { status: 201 });
}
