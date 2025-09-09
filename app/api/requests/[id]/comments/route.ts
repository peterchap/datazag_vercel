import { NextResponse, type NextRequest } from 'next/server';
import { auth } from '@/lib/auth';

// The function signature is updated to correctly handle the params promise.
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id || !session.jwt) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // We now correctly await the promise to get the params object.
    const params = await context.params;
    const requestId = params.id;
    
    const body = await req.json();
    const { comment } = body;
    
    const gatewayUrl = process.env.API_GATEWAY_URL || 'http://localhost:3000';

    const gatewayResponse = await fetch(`${gatewayUrl}/api/requests/${requestId}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.jwt}`,
      },
      body: JSON.stringify({ comment }),
    });

    const responseBody = await gatewayResponse.json();
    if (!gatewayResponse.ok) {
      return NextResponse.json(responseBody, { status: gatewayResponse.status });
    }
    
    return NextResponse.json(responseBody, { status: 201 });

  } catch (error) {
    console.error('Error proxying new comment:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
