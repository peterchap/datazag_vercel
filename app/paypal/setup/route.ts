import { NextRequest, NextResponse } from 'next/server';

/**
 * Returns a PayPal client token for the Web SDK v6.
 * Priority:
 * 1) PAYPAL_CLIENT_TOKEN or NEXT_PUBLIC_PAYPAL_CLIENT_TOKEN from env
 * 2) Dynamically generate using PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET (sandbox in dev, live in prod)
 */
export async function GET(_req: NextRequest) {
  if (process.env.PAYPAL_ENABLED !== 'true') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  const staticToken = process.env.PAYPAL_CLIENT_TOKEN || process.env.NEXT_PUBLIC_PAYPAL_CLIENT_TOKEN;
  if (staticToken) return NextResponse.json({ clientToken: staticToken });

  const clientIdRaw = process.env.PAYPAL_CLIENT_ID;
  const clientSecretRaw = process.env.PAYPAL_CLIENT_SECRET;
  const clientId = clientIdRaw?.trim();
  const clientSecret = clientSecretRaw?.trim();
  if (!clientId || !clientSecret) {
    return NextResponse.json(
      { error: 'Missing PAYPAL_CLIENT_TOKEN and PAYPAL_CLIENT_ID/SECRET. Set one of these.' },
      { status: 500 }
    );
  }

  // Determine PayPal API base
  const explicitBase = process.env.PAYPAL_API_BASE?.trim();
  const envPref = (process.env.PAYPAL_ENV || '').toLowerCase(); // 'live' | 'sandbox'
  const isProd = process.env.NODE_ENV === 'production';
  const base = explicitBase
    || (envPref === 'live' ? 'https://api-m.paypal.com'
        : envPref === 'sandbox' ? 'https://api-m.sandbox.paypal.com'
        : (isProd ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com'));
  try {
    // 1) Get OAuth access token
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const tokenRes = await fetch(`${base}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basic}`,
    'Content-Type': 'application/x-www-form-urlencoded',
    Accept: 'application/json',
      },
      body: 'grant_type=client_credentials',
    });
    if (!tokenRes.ok) {
      const t = await tokenRes.text();
      return NextResponse.json({ error: 'PayPal OAuth failed', base, detail: t }, { status: 502 });
    }
    const { access_token } = (await tokenRes.json()) as { access_token: string };
    if (!access_token) return NextResponse.json({ error: 'No access token from PayPal' }, { status: 502 });

    // 2) Generate client token
    const genRes = await fetch(`${base}/v1/identity/generate-token`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${access_token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      // Body optional; leaving empty per API docs for basic client token
      body: JSON.stringify({}),
    });
    if (!genRes.ok) {
      const g = await genRes.text();
      return NextResponse.json({ error: 'Failed generating PayPal client token', base, detail: g }, { status: 502 });
    }
    const gen = (await genRes.json()) as any;
    const clientToken = gen?.client_token || gen?.clientToken;
    if (!clientToken) return NextResponse.json({ error: 'Invalid client token response' }, { status: 502 });

    // Optionally enforce JOSE token shape if requested via env.
    if (process.env.PAYPAL_REQUIRE_JOSE === 'true') {
      // Accept either a signed JWT (3 segments) or an encrypted JWE (5 segments).
      const parts = typeof clientToken === 'string' ? clientToken.split('.') : [];
      const isJose = parts.length === 3 || parts.length === 5;
      if (!isJose) {
        return NextResponse.json(
          {
            error: 'Non-JOSE client token returned by PayPal',
            detail:
              'Your PayPal app likely does not have Advanced Checkout enabled. In the PayPal Developer Dashboard, open your Sandbox app, add/enable Advanced Checkout (Web SDK v6), then retry.',
            hint:
              'Expected a token that looks like eyJ... with dot-separated segments (JWT: header.payload.signature or JWE: header.encryptedKey.iv.ciphertext.tag). The returned value was a legacy token not compatible with the v6 Web SDK.',
          },
          { status: 502 }
        );
      }
    }

    return NextResponse.json({ clientToken });
  } catch (err: any) {
    return NextResponse.json({ error: 'PayPal setup error', message: err?.message }, { status: 500 });
  }
}
