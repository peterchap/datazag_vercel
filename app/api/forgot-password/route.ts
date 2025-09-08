import { NextResponse, type NextRequest } from 'next/server';

// This is a public API route that does not require authentication.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const gatewayUrl = process.env.API_GATEWAY_URL || 'http://localhost:3000';

    // Forward the request to your main API Gateway
    const gatewayResponse = await fetch(`${gatewayUrl}/api/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    // Return the response from the gateway back to the client
    const responseBody = await gatewayResponse.json();
    if (!gatewayResponse.ok) {
      return NextResponse.json(responseBody, { status: gatewayResponse.status });
    }
    
    return NextResponse.json(responseBody);

  } catch (error) {
    console.error('Error proxying forgot password request:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}