import { NextResponse, type NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/drizzle';
import { users } from '@/shared/schema';
import { eq } from 'drizzle-orm';

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { firstName, lastName, company } = await req.json();

    // The logic from your gateway is now here, using Drizzle's type-safe update.
    await db.update(users)
      .set({
        firstName: firstName,
        lastName: lastName,
        company: company,
      })
      .where(eq(users.id, parseInt(session.user.id, 10)));

    return NextResponse.json({ message: 'Profile updated successfully.' });

  } catch (error) {
    console.error('Error updating profile:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}