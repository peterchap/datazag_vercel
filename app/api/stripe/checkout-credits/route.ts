import { NextResponse, type NextRequest } from 'next/server';
import { auth } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || !session.jwt) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 1. Get the full JSON body from the incoming request from the frontend.
    const body = await req.json();
    
    // 2. We can add a log here to confirm we've received the full payload.
    console.log("Next.js proxy received payload:", body);

    const gatewayUrl = process.env.API_GATEWAY_URL || 'http://localhost:3000';

    const gatewayResponse = await fetch(`${gatewayUrl}/api/stripe/checkout-credits`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.jwt}`,
      },
      // 3. This is the fix: Pass the entire 'body' object directly to the gateway.
      body: JSON.stringify(body), 
    });

    const responseBody = await gatewayResponse.json();
    if (!gatewayResponse.ok) {
      return NextResponse.json(responseBody, { status: gatewayResponse.status });
    }
    return NextResponse.json(responseBody);
  } catch (error) {
    console.error('Error proxying Stripe checkout request:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}