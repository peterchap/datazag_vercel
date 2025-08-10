// Admin authentication helper for API key management
import { NextRequest, NextResponse } from 'next/server';

export function validateAdminAuth(request: NextRequest): NextResponse | null {
  const adminSecret = request.headers.get('x-admin-secret');
  const expectedSecret = process.env.ADMIN_API_SECRET;

  if (!expectedSecret) {
    console.error('ADMIN_API_SECRET not configured');
    return NextResponse.json({
      success: false,
      error: 'Server configuration error'
    }, { status: 500 });
  }

  if (!adminSecret || adminSecret !== expectedSecret) {
    return NextResponse.json({
      success: false,
      error: 'Unauthorized - Invalid admin secret'
    }, { status: 401 });
  }

  return null; // No error, continue
}