import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { USER_ROLES } from '@/shared/schema';


/**
 * GET handler to fetch a single user's details for the admin panel.
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();

  // Authenticate and authorize the admin using the modern auth() helper
  if (!session?.user || (session.user.role !== USER_ROLES.BUSINESS_ADMIN && session.user.role !== USER_ROLES.CLIENT_ADMIN)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const userId = parseInt(params.id, 10);
    if (isNaN(userId)) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    }

    // Fetch the specific user from the database
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
      // Explicitly list the columns to return for security and performance
      columns: {
        id: true,
        firstName: true,
        lastName: true,
        username: true,
        email: true,
        company: true,
        role: true,
        credits: true,
        createdAt: true,
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(user);

  } catch (error) {
    console.error('GET admin user by id error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * DELETE handler to remove a user.
 */
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();

  if (!session?.user || (session.user.role !== USER_ROLES.BUSINESS_ADMIN)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const userId = params.id; // This will now work correctly.
    const gatewayUrl = process.env.API_GATEWAY_URL || 'http://localhost:3000';

    const gatewayResponse = await fetch(`${gatewayUrl}/api/admin/users/${userId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${session.jwt}`, 
      },
    });

    const responseBody = await gatewayResponse.json();
    return NextResponse.json(responseBody, { status: gatewayResponse.status });

  } catch (error) {
    console.error('Error proxying delete user request:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}