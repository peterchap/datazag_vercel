import { NextResponse, type NextRequest } from 'next/server';
import { auth } from '@/lib/auth';

// The function signature is updated to correctly handle the params promise.
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ sessionId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id || !session.jwt) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // We now correctly await the promise to get the params object.
    const params = await context.params;
    const { sessionId } = params;
    
    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
    }
    
    const gatewayUrl = process.env.API_GATEWAY_URL || 'http://localhost:3000';

    const gatewayResponse = await fetch(`${gatewayUrl}/api/invoices/${sessionId}`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${session.jwt}` },
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