import { NextResponse, type NextRequest } from 'next/server';

// This is the "proxy" route that the email verification link will call.
export async function GET(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params;
    const gatewayUrl = process.env.API_GATEWAY_URL || 'http://localhost:3000';
    const appBaseUrl = process.env.APP_BASE_URL || 'http://localhost:3001';

    // 1. Forward the verification request to your API Gateway
    const gatewayResponse = await fetch(`${gatewayUrl}/api/verify-email-change/${token}`, {
      method: 'GET',
    });

    // 2. Based on the gateway's response, redirect the user's browser
    if (gatewayResponse.ok) {
      // On success, redirect to the login page with a success message
      return NextResponse.redirect(`${appBaseUrl}/login?emailChanged=true`);
    } else {
      // On failure, redirect to the login page with an error message
      const errorData = await gatewayResponse.json();
      const errorMessage = encodeURIComponent(errorData.error || 'Verification failed.');
      return NextResponse.redirect(`${appBaseUrl}/login?error=${errorMessage}`);
    }

  } catch (error) {
    console.error('Error proxying email change verification:', error);
    const appBaseUrl = process.env.APP_BASE_URL || 'http://localhost:3001';
    return NextResponse.redirect(`${appBaseUrl}/login?error=An+unexpected+error+occurred.`);
  }
}