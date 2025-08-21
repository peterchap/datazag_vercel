import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/drizzle';
import { users, USER_ROLES } from '@/shared/schema';
import { eq } from 'drizzle-orm';

async function isAdmin(session: any) {
  const uid = session?.user?.id ? parseInt(String(session.user.id), 10) : NaN;
  if (Number.isNaN(uid)) return false;
  const [me]: any = await db.select().from(users).where(eq(users.id, uid)).limit(1);
  return me?.role === USER_ROLES.BUSINESS_ADMIN || me?.role === USER_ROLES.CLIENT_ADMIN;
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session: any = await getServerSession(authOptions as any);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!(await isAdmin(session))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const userId = parseInt(String(params.id), 10);
    if (Number.isNaN(userId)) return NextResponse.json({ error: 'Invalid user id' }, { status: 400 });

    const [u] = await db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        username: users.username,
        email: users.email,
        company: users.company,
        role: users.role,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!u) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(u);
  } catch (e) {
    console.error('GET admin user by id error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
