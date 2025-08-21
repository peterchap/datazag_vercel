import { NextRequest, NextResponse } from 'next/server';

export async function GET(_req: NextRequest) {
  const token = process.env.PAYPAL_CLIENT_TOKEN || process.env.NEXT_PUBLIC_PAYPAL_CLIENT_TOKEN;
  if (!token) return NextResponse.json({ error: 'Missing PAYPAL_CLIENT_TOKEN' }, { status: 500 });
  return NextResponse.json({ clientToken: token });
}
