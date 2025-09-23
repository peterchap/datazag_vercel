// Customer Portal: app/api/users/[userId]/api-keys/route.ts
// This endpoint allows your BigQuery API to get a user's API keys

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/drizzle';
import { apiKeys, users } from '@/shared/schema';
import { eq, and } from 'drizzle-orm';

const INTERNAL_API_TOKEN = process.env.INTERNAL_API_TOKEN;

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  // Verify internal API token
  const authHeader = request.headers.get('X-Internal-Token');
  if (!authHeader || authHeader !== INTERNAL_API_TOKEN) {
    return NextResponse.json(
      { error: 'Unauthorized - Invalid internal token' },
      { status: 401 }
    );
  }

  const { userId } = params;

  if (!userId) {
    return NextResponse.json(
      { error: 'User ID is required' },
      { status: 400 }
    );
  }

  try {
    console.log(`[Customer Portal API] Getting API keys for user: ${userId}`);

    // Get user's active API keys
    const userApiKeys = await db
      .select({
        id: apiKeys.id,
        key: apiKeys.key,
        name: apiKeys.name,
        active: apiKeys.active,
        createdAt: apiKeys.createdAt,
      })
      .from(apiKeys)
      .innerJoin(users, eq(apiKeys.userId, users.id))
      .where(and(
        eq(apiKeys.userId, userId),
        eq(apiKeys.active, true)
      ))
      .orderBy(apiKeys.createdAt);

    console.log(`[Customer Portal API] Found ${userApiKeys.length} active API keys for user ${userId}`);

    // Also get user's current credit balance for reference
    const user = await db
      .select({ credits: users.credits })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    const currentCredits = user.length > 0 ? user[0].credits : 0;

    return NextResponse.json({
      success: true,
      data: {
        userId,
        currentCredits,
        apiKeys: userApiKeys.map(key => ({
          id: key.id,
          key: key.key,
          name: key.name || 'Unnamed Key',
          active: key.active,
          createdAt: key.createdAt,

        }))
      }
    });

  } catch (error) {
    console.error(`[Customer Portal API] Error getting API keys for user ${userId}:`, error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST endpoint to notify customer portal of API key usage
export async function POST(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  // Verify internal API token
  const authHeader = request.headers.get('X-Internal-Token');
  if (!authHeader || authHeader !== INTERNAL_API_TOKEN) {
    return NextResponse.json(
      { error: 'Unauthorized - Invalid internal token' },
      { status: 401 }
    );
  }

  const { userId } = params;
  
  try {
    const body = await request.json();
    const { apiKey, creditsUsed, endpoint, newCreditBalance } = body;

    console.log(`[Customer Portal API] Recording usage for user ${userId}: ${creditsUsed} credits used`);

    // Update user's credit balance in database
    if (typeof newCreditBalance === 'number') {
      await db
        .update(users)
        .set({ credits: newCreditBalance })
        .where(eq(users.id, userId));
    }

    
    // You could also record detailed usage logs here
    /*
    await db.insert(apiUsageLogs).values({
      userId,
      apiKey,
      endpoint,
      creditsUsed,
      timestamp: new Date(),
    });
    */

    return NextResponse.json({
      success: true,
      message: 'Usage recorded successfully'
    });

  } catch (error) {
    console.error(`[Customer Portal API] Error recording usage for user ${userId}:`, error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}