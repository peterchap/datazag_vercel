import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/drizzle';
import { users } from '@/shared/schema';
import { eq, and, isNotNull } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = String(body?.email || '').toLowerCase().trim();
    const token = String(body?.token || '').trim();
    const password = String(body?.password || '');
    if (!email || !token || !password) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: 'Password too short' }, { status: 400 });
    }

    const rows = await db.select().from(users).where(and(
      eq(users.email, email),
      isNotNull(users.passwordResetToken),
      eq(users.passwordResetToken, token),
      isNotNull(users.passwordResetExpires),
    )).limit(1);
    const u: any = rows[0];
    if (!u || !u.passwordResetExpires || new Date(u.passwordResetExpires) < new Date()) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 400 });
    }

    const hash = await bcrypt.hash(password, 10);
    await db.update(users)
      .set({ password: hash, passwordResetToken: null as any, passwordResetExpires: null as any })
      .where(eq(users.id, u.id));

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error('reset-password error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
