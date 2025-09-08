import { NextResponse, type NextRequest } from 'next/server';
import { auth } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || !session.jwt) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const body = await req.json();
    const gatewayUrl = process.env.API_GATEWAY_URL || 'http://localhost:3000';
    const gatewayResponse = await fetch(`${gatewayUrl}/api/request-email-change`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.jwt}`,
      },
      body: JSON.stringify(body),
    });
    const responseBody = await gatewayResponse.json();
    return NextResponse.json(responseBody, { status: gatewayResponse.status });
  } catch (error) {
    console.error('Error proxying email change request:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}