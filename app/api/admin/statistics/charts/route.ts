import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { USER_ROLES } from '@/shared/schema';

// This is the proxy route that the client component will poll.
export async function GET() {
  const session = await auth();
  if (!session?.user || (session.user.role !== USER_ROLES.BUSINESS_ADMIN && session.user.role !== USER_ROLES.CLIENT_ADMIN) || !session.jwt) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const gatewayUrl = process.env.API_GATEWAY_URL || 'http://localhost:3000';
    
    const gatewayResponse = await fetch(`${gatewayUrl}/api/admin/statistics/charts`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${session.jwt}`,
      },
      // Use no-store to ensure we always get the latest data from the gateway
      cache: 'no-store',
    });

    const data = await gatewayResponse.json();
    if (!gatewayResponse.ok) {
      return NextResponse.json(data, { status: gatewayResponse.status });
    }
    
    return NextResponse.json(data);

  } catch (error) {
    console.error('Error proxying admin chart data:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}