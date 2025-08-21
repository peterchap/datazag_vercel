import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/drizzle';
import { apiUsage } from '@/shared/schema';
import { eq, desc } from 'drizzle-orm';

interface SessionUser {
  id: string;
  email?: string | null;
  role?: string;
}

export async function GET(request: NextRequest) {
  try {
  const session = await getServerSession(authOptions);
  const user = session?.user as SessionUser | undefined;
  if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const usage = await db.select()
      .from(apiUsage)
  .where(eq(apiUsage.userId, parseInt(user.id)))
      .orderBy(desc(apiUsage.createdAt))
      .limit(100);

    return NextResponse.json(usage);
  } catch (error) {
    console.error('Error fetching API usage:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
