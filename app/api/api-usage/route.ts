import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/server/db';
import { apiUsage } from '@/shared/schema';
import { eq, desc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const usage = await db.select()
      .from(apiUsage)
      .where(eq(apiUsage.userId, parseInt(session.user.id)))
      .orderBy(desc(apiUsage.createdAt))
      .limit(100);

    return NextResponse.json(usage);
  } catch (error) {
    console.error('Error fetching API usage:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
