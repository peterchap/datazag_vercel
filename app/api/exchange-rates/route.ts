import { NextResponse } from 'next/server';

// This is a Route Handler that runs on the server.
export async function GET() {
  try {
    // We add { cache: 'no-store' } to ensure this fetch is always live
    // and not cached by the Next.js Data Cache.
    const response = await fetch('https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml', {
      cache: 'no-store' 
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch exchange rates from ECB.');
    }
    const xmlText = await response.text();

    // --- Simple XML Parsing ---
    const rates: { [key: string]: number } = { EUR: 1.0 };
    const lines = xmlText.split('\n');
    lines.forEach(line => {
      const match = line.match(/currency='(\w+)' rate='([\d.]+)'/);
      if (match) {
        rates[match[1]] = parseFloat(match[2]);
      }
    });
    // --- End Parsing ---

    // Convert all rates to be relative to USD for easier use
    const usdRate = rates['USD'];
    if (!usdRate) {
      throw new Error('USD rate not found in ECB data.');
    }

    const ratesVsUsd: { [key:string]: number } = {};
    for (const currency in rates) {
      ratesVsUsd[currency] = rates[currency] / usdRate;
    }
    
    return NextResponse.json({ success: true, rates: ratesVsUsd });

  } catch (error) {
    console.error('Exchange rate API error:', error);
    return NextResponse.json({ success: false, error: 'Could not fetch exchange rates.' }, { status: 500 });
  }
}