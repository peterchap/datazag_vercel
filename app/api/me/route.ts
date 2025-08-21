import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/drizzle';
import { users } from '@/shared/schema';
import { eq } from 'drizzle-orm';

export async function GET() {
  try {
  const session: any = await getServerSession(authOptions as any);
  const userId = session?.user?.id ? parseInt(String(session.user.id), 10) : NaN;
    if (!session || Number.isNaN(userId)) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const result = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    const u: any = result[0];
    if (!u) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    return NextResponse.json({
      id: u.id,
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.email,
      company: u.company,
      credits: u.credits,
      role: u.role,
      canPurchaseCredits: u.canPurchaseCredits,
      forcePasswordReset: Boolean(u.passwordResetToken),
    });
  } catch (error) {
    console.error('GET /api/me error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
