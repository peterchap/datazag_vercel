import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/server/db';
import { users, USER_ROLES } from '@/shared/schema';
import { eq } from 'drizzle-orm';

async function isAdmin(session: any) {
  if (!session?.user?.id) return false;
  
  const [user] = await db.select()
    .from(users)
    .where(eq(users.id, parseInt(session.user.id)))
    .limit(1);
    
  return user?.role === USER_ROLES.BUSINESS_ADMIN || user?.role === USER_ROLES.CLIENT_ADMIN;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
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
      createdAt: users.createdAt
    }).from(users);

    return NextResponse.json(allUsers);
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
