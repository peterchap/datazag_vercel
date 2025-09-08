import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

// This is the proxy route for GET /api/client-admin/company-users
export async function GET() {
  const session = await auth();
  if (!session?.user?.id || !session.jwt) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const gatewayUrl = process.env.API_GATEWAY_URL || 'http://localhost:3000';
    
    const gatewayResponse = await fetch(`${gatewayUrl}/api/client-admin/company-users`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${session.jwt}`,
      },
      cache: 'no-store',
    });

    const data = await gatewayResponse.json();
    if (!gatewayResponse.ok) {
      return NextResponse.json(data, { status: gatewayResponse.status });
    }
    
    return NextResponse.json(data);

  } catch (error) {
    console.error('Error proxying company users request:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}