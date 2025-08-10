// CORS helper for API key management endpoints
import { NextRequest, NextResponse } from 'next/server';

const ALLOWED_ORIGINS = [
  'https://portal.datazag.com',
  'http://localhost:3000',
  'https://datazag-vercel.vercel.app',
  'https://datazag-vercel-datazag.vercel.app',
  'https://datazag-vercel-git-master-datazag.vercel.app'
];

export function validateOrigin(request: NextRequest): string | null {
  const origin = request.headers.get('origin');
  
  // Server-to-server requests without Origin header are allowed
  if (!origin) {
    return null;
  }
  
  // Check if origin is in allowed list
  if (ALLOWED_ORIGINS.includes(origin)) {
    return origin;
  }
  
  return null;
}

export function handleCorsHeaders(request: NextRequest, response: NextResponse): NextResponse {
  const origin = validateOrigin(request);
  
  if (origin) {
    response.headers.set('Access-Control-Allow-Origin', origin);
  }
  
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Secret');
  response.headers.set('Access-Control-Max-Age', '86400');
  
  return response;
}

export function handleCorsPreflightRequest(request: NextRequest): NextResponse | null {
  if (request.method === 'OPTIONS') {
    const origin = validateOrigin(request);
    
    if (!origin) {
      // Return 403 for disallowed origins
      return NextResponse.json({
        success: false,
        error: 'Origin not allowed'
      }, { status: 403 });
    }
    
    const response = new NextResponse(null, { status: 204 });
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Secret');
    response.headers.set('Access-Control-Max-Age', '86400');
    
    return response;
  }
  
  return null;
}

export function validateCorsForActualRequest(request: NextRequest): NextResponse | null {
  const origin = request.headers.get('origin');
  
  // Allow requests without Origin header (server-to-server)
  if (!origin) {
    return null;
  }
  
  // Check if origin is allowed
  if (!ALLOWED_ORIGINS.includes(origin)) {
    return NextResponse.json({
      success: false,
      error: 'Origin not allowed'
    }, { status: 403 });
  }
  
  return null;
}