import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/drizzle';
import { apiKeys, users, USER_ROLES } from '@/shared/schema';
import { and, eq, sql } from 'drizzle-orm';

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

    // Pagination support
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '10', 10)));

    const whereExpr = eq(apiKeys.userId, userId);

    const [{ count }]: any = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(apiKeys)
      .where(whereExpr);

    const rows = await db.select({
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
    const sanitized = rows.map(r => ({ ...r, key: r.key?.replace(/.(?=.{4})/g, '*') }));
  return NextResponse.json({ data: sanitized, total: count ?? 0, page, pageSize });
  } catch (e) {
    console.error('GET admin user api-keys error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
