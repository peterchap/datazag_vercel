import { NextResponse } from 'next/server';

// Mark all notifications as read (stub)
export async function POST() {
  return NextResponse.json({ success: true });
}
