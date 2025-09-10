import { NextResponse, type NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/drizzle';
import { users } from '@/shared/schema';
import { eq } from 'drizzle-orm';
import { USER_ROLES } from '@/shared/schema';

// The function signature is updated to correctly handle the params promise.
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session?.user || (session.user.role !== USER_ROLES.BUSINESS_ADMIN)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    // We now correctly await the promise to get the params object.
    const params = await context.params;
    const userId = parseInt(params.id, 10);
    const { role } = await req.json();

    if (!role || !Object.values(USER_ROLES).includes(role as any)) {
      return NextResponse.json({ error: 'Invalid role specified' }, { status: 400 });
    }
    
    await db.update(users)
      .set({ role: role })
      .where(eq(users.id, userId));

    return NextResponse.json({ success: true, message: 'User role updated.' });

  } catch (error) {
    console.error('Error changing user role:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}