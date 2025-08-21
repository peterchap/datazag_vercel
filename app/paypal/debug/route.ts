import { NextResponse } from 'next/server';

export async function GET() {
  const explicitBase = process.env.PAYPAL_API_BASE?.trim();
  const paypalEnv = (process.env.PAYPAL_ENV || '').toLowerCase();
  const isProd = process.env.NODE_ENV === 'production';
  const base = explicitBase
    || (paypalEnv === 'live' ? 'https://api-m.paypal.com'
        : paypalEnv === 'sandbox' ? 'https://api-m.sandbox.paypal.com'
        : (isProd ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com'));

  const cid = process.env.PAYPAL_CLIENT_ID || '';
  const csec = process.env.PAYPAL_CLIENT_SECRET || '';

  const mask = (s: string) => {
    if (!s) return '';
    const head = s.slice(0, 6);
    const tail = s.slice(-4);
    return `${head}...${tail}`;
  };

  return NextResponse.json({
    nodeEnv: process.env.NODE_ENV,
    paypalEnv: paypalEnv || (isProd ? 'live (by NODE_ENV)' : 'sandbox (by NODE_ENV)'),
    paypalApiBase: base,
    hasClientId: !!cid,
    hasClientSecret: !!csec,
    clientIdPreview: mask(cid),
    clientSecretPreview: mask(csec),
    clientIdLength: cid.length,
    clientSecretLength: csec.length,
  });
}
