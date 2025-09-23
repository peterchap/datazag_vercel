import { NextResponse } from 'next/server';

const API_KEY = process.env.EXCHANGERATE_API_KEY;

interface ExchangeRateSuccessResponse {
  result: 'success';
  conversion_rates: Record<string, number>;
}

interface ExchangeRateErrorResponse {
  result: 'error';
}

type ExchangeRateAPIResponse = ExchangeRateSuccessResponse | ExchangeRateErrorResponse;

type SupportedCode = [string, string];

interface CodesSuccessResponse {
  result: 'success';
  supported_codes: SupportedCode[];
}

interface CodesErrorResponse {
  result: 'error';
}

type CodesAPIResponse = CodesSuccessResponse | CodesErrorResponse;

interface Currency {
  code: string;
  name: string;
}

interface SuccessPayload {
  success: true;
  rates: Record<string, number>;
  currencies: Currency[];
}

interface ErrorPayload {
  success: false;
  error: string;
}

type ApiResponsePayload = SuccessPayload | ErrorPayload;

export async function GET(): Promise<NextResponse<ApiResponsePayload>> {
  if (!API_KEY) {
    return NextResponse.json<ErrorPayload>({ success: false, error: 'API key not configured.' }, { status: 500 });
  }

  // URLs for both API endpoints
  const ratesUrl: string = `https://v6.exchangerate-api.com/v6/${API_KEY}/latest/USD`;
  const codesUrl: string = `https://v6.exchangerate-api.com/v6/${API_KEY}/codes`;

  try {
    // Use Promise.all to fetch both simultaneously for speed
    const [ratesResponse, codesResponse]: [Response, Response] = await Promise.all([
      fetch(ratesUrl, { next: { revalidate: 3600 } }), // Cache rates for 1 hour
      fetch(codesUrl, { next: { revalidate: 86400 } })  // Cache codes for 1 day
    ]);

    if (!ratesResponse.ok || !codesResponse.ok) {
      throw new Error('Failed to fetch data from ExchangeRate-API');
    }

    const ratesData: ExchangeRateAPIResponse = await ratesResponse.json();
    const codesData: CodesAPIResponse = await codesResponse.json();

    if (ratesData.result === 'error' || codesData.result === 'error') {
      throw new Error('One of the API calls returned an error');
    }
    
    // Format the currency list with full names
    const currencyList: Currency[] = codesData.supported_codes.map(([code, name]: SupportedCode) => ({
      code,
      name
    })).sort((a, b) => a.name.localeCompare(b.name));

    // Combine both results into a single response
    return NextResponse.json<SuccessPayload>({ 
      success: true, 
      rates: ratesData.conversion_rates,
      currencies: currencyList 
    });

  } catch (error: any) {
    console.error('Exchange rate API error:', error.message);
    return NextResponse.json<ErrorPayload>({ success: false, error: 'Could not fetch exchange rates.' }, { status: 500 });
  }
}