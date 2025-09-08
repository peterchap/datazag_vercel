import { NextResponse, type NextRequest } from 'next/server';

// This is the public API route that your registration form will call.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const gatewayUrl = process.env.API_GATEWAY_URL || 'http://localhost:3000';

    // It securely forwards the request to your main API Gateway.
    const gatewayResponse = await fetch(`${gatewayUrl}/api/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    // It then returns the response from the gateway back to the client.
    const responseBody = await gatewayResponse.json();
    if (!gatewayResponse.ok) {
      // Forward any error messages from the gateway (e.g., "User already exists")
      return NextResponse.json(responseBody, { status: gatewayResponse.status });
    }
    
    return NextResponse.json(responseBody, { status: 201 });

  } catch (error) {
    console.error('Error proxying registration request:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}