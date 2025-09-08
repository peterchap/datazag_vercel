import { NextResponse, type NextRequest } from 'next/server';
import { auth } from '@/lib/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  const session = await auth();
  if (!session?.user?.id || !session.jwt) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { sessionId } = params;
    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
    }
    
    const gatewayUrl = process.env.API_GATEWAY_URL || 'http://localhost:3000';

    // This is the fix: The URL now correctly includes the '/stripe' path segment
    // to match the route defined in your API Gateway.
    const gatewayResponse = await fetch(`${gatewayUrl}/api/stripe/invoices/${sessionId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${session.jwt}`,
      },
    });

    const responseBody = await gatewayResponse.json();
    if (!gatewayResponse.ok) {
      return NextResponse.json(responseBody, { status: gatewayResponse.status });
    }
    
    return NextResponse.json(responseBody);

  } catch (error) {
    console.error('Error proxying invoice request:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}