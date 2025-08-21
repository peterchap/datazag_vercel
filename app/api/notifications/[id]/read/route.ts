import { NextResponse } from 'next/server';

// Mark a single notification as read (stub)
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  return NextResponse.json({ success: true, id: params.id });
}
