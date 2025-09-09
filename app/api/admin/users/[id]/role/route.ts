import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { USER_ROLES } from '@/shared/schema';

// The function signature is updated to correctly handle the params promise.
export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || (session.user.role !== USER_ROLES.BUSINESS_ADMIN && session.user.role !== USER_ROLES.CLIENT_ADMIN)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    // We now correctly await the promise to get the params object.
    const params = await context.params;
    const userId = params.id;
    const { role } = await request.json();

    const gatewayUrl = process.env.API_GATEWAY_URL || 'http://localhost:3000';

    const gatewayResponse = await fetch(`${gatewayUrl}/api/admin/users/${userId}/role`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.jwt}`, 
      },
      body: JSON.stringify({ role }),
    });

    const responseBody = await gatewayResponse.json();
    return NextResponse.json(responseBody, { status: gatewayResponse.status });

  } catch (error) {
    console.error('Error proxying change role request:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}