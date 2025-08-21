import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/drizzle';
import { users, USER_ROLES } from '@/shared/schema';
import { eq } from 'drizzle-orm';

interface SessionUser {
  id: string;
  role?: string;
  email?: string | null;
}

async function isAdmin(session: any) {
  const user = session?.user as SessionUser | undefined;
  if (!user?.id) return false;
  const [dbUser] = await db.select()
    .from(users)
    .where(eq(users.id, parseInt(user.id)))
    .limit(1);
  return dbUser?.role === USER_ROLES.BUSINESS_ADMIN || dbUser?.role === USER_ROLES.CLIENT_ADMIN;
}

export async function GET(request: NextRequest) {
  try {
  const session = await getServerSession(authOptions);
  const user = session?.user as SessionUser | undefined;
  if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!(await isAdmin(session))) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const allUsers = await db.select({
      id: users.id,
      username: users.username,
      firstName: users.firstName,
      lastName: users.lastName,
      email: users.email,
      company: users.company,
      credits: users.credits,
      role: users.role,
      canPurchaseCredits: users.canPurchaseCredits,
      creditThreshold: users.creditThreshold,
  active: users.active,
  lastLogin: users.lastLogin,
  stripeCustomerId: users.stripeCustomerId,
  parentUserId: users.parentUserId,
  gracePeriodEnd: users.gracePeriodEnd,
  emailVerified: users.emailVerified,
  twoFactorEnabled: users.twoFactorEnabled,
  // createdAt removed: not present on users schema
    }).from(users);

    return NextResponse.json(allUsers);
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
