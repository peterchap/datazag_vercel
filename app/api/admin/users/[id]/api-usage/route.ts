import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/drizzle';
import { apiUsage, users, USER_ROLES } from '@/shared/schema';
import { and, desc, eq, gte, lte, sql } from 'drizzle-orm';

async function isAdmin(session: any) {
  const uid = session?.user?.id ? parseInt(String(session.user.id), 10) : NaN;
  if (Number.isNaN(uid)) return false;
  const [me]: any = await db.select().from(users).where(eq(users.id, uid)).limit(1);
  return me?.role === USER_ROLES.BUSINESS_ADMIN || me?.role === USER_ROLES.CLIENT_ADMIN;
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session: any = await getServerSession(authOptions as any);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!(await isAdmin(session))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const userId = parseInt(String(params.id), 10);
    if (Number.isNaN(userId)) return NextResponse.json({ error: 'Invalid user id' }, { status: 400 });

    // Pagination & filters
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '10', 10)));
    const start = searchParams.get('start'); // ISO date or datetime
    const end = searchParams.get('end');

    const clauses: any[] = [eq(apiUsage.userId, userId)];
    if (start) clauses.push(gte(apiUsage.createdAt, new Date(start)));
    if (end) clauses.push(lte(apiUsage.createdAt, new Date(end)));
    const whereExpr = clauses.length > 1 ? and(...clauses) : clauses[0];

    // Total count
    const [{ count }]: any = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(apiUsage)
      .where(whereExpr);

    // Page rows
    const rows = await db
      .select({
        id: apiUsage.id,
        endpoint: apiUsage.endpoint,
        queryType: apiUsage.queryType,
        creditsUsed: apiUsage.creditsUsed,
        status: apiUsage.status,
        responseTime: apiUsage.responseTime,
        createdAt: apiUsage.createdAt,
      })
      .from(apiUsage)
      .where(whereExpr)
      .orderBy(desc(apiUsage.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    return NextResponse.json({ data: rows, total: count ?? 0, page, pageSize });
  } catch (e) {
    console.error('GET admin user api-usage error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
