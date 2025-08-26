import { NextResponse } from 'next/server';

// Mark a single notification as read (stub)
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return NextResponse.json({ success: true, id });
}
