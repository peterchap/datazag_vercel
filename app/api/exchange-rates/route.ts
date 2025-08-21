import { NextResponse } from 'next/server'

const DEFAULT_RATES: Record<string, number> = {
  USD: 1.0,
  EUR: 0.93,
  GBP: 0.79,
  JPY: 155.0,
  CAD: 1.36,
  AUD: 1.52,
  CHF: 0.91,
  CNY: 7.23,
  INR: 83.5,
  SGD: 1.35,
  ZAR: 18.61,
  NZD: 1.64,
};

export async function GET() {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);
    const res = await fetch('https://api.exchangerate.host/latest?base=USD', { signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) {
      return NextResponse.json(DEFAULT_RATES, {
        headers: { 'Cache-Control': 'no-cache' },
      });
    }

    const data = await res.json();
    const src: Record<string, number> = data?.rates ?? {};
    const desired = Object.keys(DEFAULT_RATES);
    const rates = desired.reduce<Record<string, number>>((acc, code) => {
      acc[code] = typeof src[code] === 'number' ? src[code] : DEFAULT_RATES[code];
      return acc;
    }, {});

    return NextResponse.json(rates, {
      headers: { 'Cache-Control': 's-maxage=3600, stale-while-revalidate=600' },
    });
  } catch {
    // Network error or timeout: return stable defaults to avoid 500s
    return NextResponse.json(DEFAULT_RATES, {
      headers: { 'Cache-Control': 'no-cache' },
    });
  }
}