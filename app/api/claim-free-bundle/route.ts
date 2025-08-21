import { cookies, headers } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    // Resolve a gateway base that is not the same as the current Next server to avoid self-calls/loops
    const hdrs0 = await headers();
    const host = hdrs0.get('x-forwarded-host') || hdrs0.get('host') || '';
    const configuredBase = process.env.NEXT_PUBLIC_API_GATEWAY_URL || '';
    // If configured base points to same host, try a fallback port (commonly gateway runs on 3001 when Next uses 3000)
    let apiBase = configuredBase;
    try {
      const u = new URL(configuredBase || 'http://localhost:3000');
      if (!configuredBase || u.host === host) {
        apiBase = process.env.API_GATEWAY_FALLBACK_URL || 'http://localhost:3001';
      }
    } catch {
      apiBase = process.env.API_GATEWAY_FALLBACK_URL || 'http://localhost:3001';
    }
    const body = await req.json().catch(() => ({}));
    const { bundleId, userId: userIdFromBody } = body || {};
    if (!bundleId) return NextResponse.json({ message: 'bundleId is required' }, { status: 400 });

  const hdrs = await headers();
  const auth = hdrs.get('authorization');
  if (process.env.NODE_ENV !== 'production') {
    console.log('[claim-free-bundle proxy] Incoming with Authorization:', !!auth, { host, apiBase });
  }

    // If Authorization present, forward to public authenticated endpoint
  if (auth) {
      const ac = new AbortController();
      const t = setTimeout(() => ac.abort(), 7000);
      const res = await fetch(`${apiBase}/api/claim-free-bundle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': auth,
        },
        body: JSON.stringify({ bundleId }),
        signal: ac.signal,
      }).finally(() => clearTimeout(t));
      const text = await res.text();
      return new NextResponse(text, { status: res.status, headers: { 'Content-Type': res.headers.get('content-type') || 'application/json' } });
    }

    // Else try internal service-key flow with userId
  const cookieStore = await cookies();
  const userIdCookie = cookieStore.get('user_id')?.value || cookieStore.get('userId')?.value || cookieStore.get('uid')?.value;
    const userId = Number(userIdCookie || userIdFromBody);
    const serviceKey = process.env.API_SERVICE_KEY || process.env.INTERNAL_API_TOKEN || process.env.ADMIN_API_SECRET;
    if (process.env.NODE_ENV !== 'production') {
      console.log('[claim-free-bundle proxy] Using service-key flow', {
        hasServiceKey: !!serviceKey,
        userIdFromBody: userIdFromBody ? 'present' : 'missing',
        userIdCookie: userIdCookie ? 'present' : 'missing',
        userIdResolved: userId || 'missing'
      });
    }
    if (!userId || !serviceKey) {
      return NextResponse.json({ message: 'Authentication required' }, { status: 401 });
    }

    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), 7000);
    const res = await fetch(`${apiBase}/api/internal/claim-free-bundle`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-service-key': String(serviceKey),
      },
      body: JSON.stringify({ bundleId, userId }),
      signal: ac.signal,
    }).finally(() => clearTimeout(t));
    const text = await res.text();
    return new NextResponse(text, { status: res.status, headers: { 'Content-Type': res.headers.get('content-type') || 'application/json' } });
  } catch (e: any) {
    return NextResponse.json({ message: e?.message || 'Server error' }, { status: 500 });
  }
}
