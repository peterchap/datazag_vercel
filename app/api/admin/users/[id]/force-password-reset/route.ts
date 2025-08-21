import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/drizzle';
import { users, USER_ROLES } from '@/shared/schema';
import { eq } from 'drizzle-orm';

function generateToken(len = 48) {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let s = '';
  for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session: any = await getServerSession(authOptions as any);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const adminId = parseInt(String(session.user.id), 10);
    const [admin] = await db.select().from(users).where(eq(users.id, adminId)).limit(1);
    if (!admin || !(admin.role === USER_ROLES.BUSINESS_ADMIN || admin.role === USER_ROLES.CLIENT_ADMIN)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const userId = parseInt(String(params.id), 10);
    if (Number.isNaN(userId)) return NextResponse.json({ error: 'Invalid user id' }, { status: 400 });

    const token = generateToken();
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

    // Update user with reset token and expiry
    await db.update(users)
      .set({ passwordResetToken: token, passwordResetExpires: expires })
      .where(eq(users.id, userId));

    return NextResponse.json({ ok: true, token, expires: expires.toISOString() });
  } catch (e) {
    console.error('force-password-reset error', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
