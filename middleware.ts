import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Simple middleware - just pass through for now
  // This allows the client-side auth to handle redirects
  return NextResponse.next()
}
