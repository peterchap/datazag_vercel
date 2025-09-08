import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth'; // Import the new auth function
import { db } from '@/lib/drizzle';
import { eq } from 'drizzle-orm';
import { users } from '@/shared/schema';

export async function GET() {
  // Use the auth() function to get the session on the server
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const userId = parseInt(session.user.id, 10);
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Return the user data (without the password hash)
    const { password, ...userData } = user;
    return NextResponse.json(userData);

  } catch (error) {
    console.error('Error fetching user data:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
