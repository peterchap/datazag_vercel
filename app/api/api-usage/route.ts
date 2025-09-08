import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth'; // 1. Import the new v5 auth helper
import { db } from '@/lib/drizzle';
import { apiUsage } from '@/shared/schema';
import { eq, desc } from 'drizzle-orm';

export async function GET() {
  // 2. Get the session using the modern auth() function
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Fetch API usage data for the logged-in user from the database
    const userApiUsage = await db.query.apiUsage.findMany({
      where: eq(apiUsage.userId, parseInt(session.user.id, 10)),
      orderBy: [desc(apiUsage.createdAt)],
      limit: 100, // Limit the number of records for performance
    });

    return NextResponse.json(userApiUsage);
  } catch (error) {
    console.error('Failed to fetch API usage:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
