import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/drizzle';
import { apiUsage } from '@/shared/schema';
import { eq, desc } from 'drizzle-orm';

/**
 * GET /api/api-usage
 * Fetches the API usage history for the currently authenticated user.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const userApiUsage = await db.query.apiUsage.findMany({
      where: eq(apiUsage.userId, parseInt(session.user.id, 10)),
      orderBy: [desc(apiUsage.createdAt)],
    });

    return NextResponse.json(userApiUsage);
  } catch (error) {
    console.error('Error fetching API usage:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
