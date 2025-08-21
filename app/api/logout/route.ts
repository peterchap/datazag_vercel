import { NextResponse } from 'next/server';

// Backward compatible logout route (NextAuth uses JWT strategy; nothing to revoke server-side)
export async function POST() {
  return NextResponse.json({ success: true });
}

export async function GET() { // Optional GET support
  return NextResponse.json({ success: true });
}
