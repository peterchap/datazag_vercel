import { NextResponse, type NextRequest } from 'next/server';
import { auth } from '@/lib/auth';

// This is the new API route that your frontend will call.
export async function POST(req: NextRequest) {
  const session = await auth();

  // 1. Secure the endpoint to ensure only authenticated users can submit requests.
  if (!session?.user?.id || !session.jwt) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 2. Get the form data from the incoming request.
    const body = await req.json();
    const { category, subject, description } = body;

    // 3. Define the URL for your external API Gateway.
    const gatewayUrl = process.env.API_GATEWAY_URL || 'http://localhost:3000';

    // 4. Forward the request to your API Gateway, including the user's token.
    const gatewayResponse = await fetch(`${gatewayUrl}/api/requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.jwt}`,
      },
      body: JSON.stringify({ category, subject, description }),
    });

    // 5. Forward the response from the gateway back to the client.
    const responseBody = await gatewayResponse.json();
    if (!gatewayResponse.ok) {
      return NextResponse.json(responseBody, { status: gatewayResponse.status });
    }
    
    return NextResponse.json(responseBody, { status: 201 });

  } catch (error) {
    console.error('Error proxying new request:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}