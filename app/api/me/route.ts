import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/drizzle';
import { users } from '@/shared/schema';
import { eq } from 'drizzle-orm';

// This is the new, unified API route for fetching the authenticated user's profile.
export async function GET() {
  // 1. Authenticate the user securely on the server.
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 2. Fetch the user's data from the database using Drizzle.
    const userProfile = await db.query.users.findFirst({
      where: eq(users.id, parseInt(session.user.id, 10)),
      // Explicitly list the columns to return for security and performance.
      columns: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        company: true,
        credits: true,
        role: true,
        canPurchaseCredits: true,
      }
    });

    if (!userProfile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // 3. Return the user's profile data.
    return NextResponse.json(userProfile);

  } catch (error) {
    console.error('Error fetching user profile:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
