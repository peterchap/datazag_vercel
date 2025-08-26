import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/drizzle';
import { apiKeys, users, USER_ROLES } from '@/shared/schema';
import { eq, sql } from 'drizzle-orm';

type Session = {
  user?: {
    id?: number | string;
  };
} | null;

async function isAdmin(session: Session): Promise<boolean> {
  const uid = session?.user?.id ? parseInt(String(session.user.id), 10) : NaN;
  if (Number.isNaN(uid)) return false;
  
  const result = await db.select().from(users).where(eq(users.id, uid)).limit(1);
  const me = result[0] as { role?: string } | undefined;
  return me?.role === USER_ROLES.BUSINESS_ADMIN || me?.role === USER_ROLES.CLIENT_ADMIN;
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    // Await the params Promise
    const { id } = await context.params;
    
    const sessionResult = await getServerSession(authOptions as any);
    const session = sessionResult as Session;
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!(await isAdmin(session))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const userId = parseInt(String(id), 10);
    if (Number.isNaN(userId)) {
      return NextResponse.json({ error: 'Invalid user id' }, { status: 400 });
    }

    // Pagination support
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '10', 10)));

    const whereExpr = eq(apiKeys.userId, userId);

    const countResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(apiKeys)
      .where(whereExpr);

    const count = countResult.length > 0 ? countResult[0].count : 0;

    const rows = await db
      .select({
        id: apiKeys.id,
        name: apiKeys.name,
        isActive: apiKeys.isActive,
        createdAt: apiKeys.createdAt,
        key: apiKeys.key,
      })
      .from(apiKeys)
      .where(whereExpr)
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    // Do not leak full keys: mask
    const sanitized = rows.map(r => ({
      ...r,
      key: typeof r.key === 'string' ? r.key.replace(/.(?=.{4})/g, '*') : r.key,
    }));

    return NextResponse.json({ data: sanitized, total: count ?? 0, page, pageSize });
  } catch (e) {
    console.error('GET admin user api-keys error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}