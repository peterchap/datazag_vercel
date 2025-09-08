import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { USER_ROLES } from '@/shared/schema';

// The function signature is corrected to properly receive params.
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();

  if (!session?.user || (session.user.role !== USER_ROLES.BUSINESS_ADMIN && session.user.role !== USER_ROLES.CLIENT_ADMIN)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const userId = params.id; // This will now work correctly.
    const { amount } = await request.json();
    const gatewayUrl = process.env.API_GATEWAY_URL || 'http://localhost:3000'; 

    const gatewayResponse = await fetch(`${gatewayUrl}/api/admin/users/${userId}/credits`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.jwt}`, 
      },
      body: JSON.stringify({ amount }),
    });

    const responseBody = await gatewayResponse.json();
    return NextResponse.json(responseBody, { status: gatewayResponse.status });

  } catch (error) {
    console.error('Error proxying add credits request:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

