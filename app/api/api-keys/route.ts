// Session-based API key management for the portal UI (no admin secret, no CORS hurdles)
import { NextResponse, type NextRequest } from 'next/server';
import { auth } from '@/lib/auth';

const GATEWAY_URL = process.env.API_GATEWAY_URL || 'http://localhost:3000';

/**
 * GET /api/api-keys
 * Securely proxies the request to the API Gateway to fetch the user's keys.
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || !session.jwt) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const gatewayResponse = await fetch(`${GATEWAY_URL}/api/api-keys`, {
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
    console.error('Proxy GET /api-keys error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * POST /api/api-keys
 * Securely proxies the request to the API Gateway to create a new key.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || !session.jwt) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();

    const gatewayResponse = await fetch(`${GATEWAY_URL}/api/api-keys`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.jwt}`,
      },
      body: JSON.stringify(body),
    });

    const data = await gatewayResponse.json();
    if (!gatewayResponse.ok) {
      return NextResponse.json(data, { status: gatewayResponse.status });
    }
    return NextResponse.json(data, { status: 201 });

  } catch (error) {
    console.error('Proxy POST /api-keys error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
