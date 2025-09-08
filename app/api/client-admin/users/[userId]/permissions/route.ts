import { NextResponse, type NextRequest } from 'next/server';
import { auth } from '@/lib/auth';

// This is the proxy route for PATCH /api/client-admin/users/:userId/permissions
export async function PATCH(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  const session = await auth();
  if (!session?.user?.id || !session.jwt) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { userId } = params;
    const body = await req.json();
    const gatewayUrl = process.env.API_GATEWAY_URL || 'http://localhost:3000';

    const gatewayResponse = await fetch(`${gatewayUrl}/api/client-admin/users/${userId}/permissions`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.jwt}`,
      },
      body: JSON.stringify(body),
    });

    const data = await gatewayResponse.json();
    if (!gatewayResponse.ok) {
      return NextResponse.json(data, { status: gatewayResponse.status });
    }
    
    return NextResponse.json(data);

  } catch (error) {
    console.error('Error proxying update permissions request:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}