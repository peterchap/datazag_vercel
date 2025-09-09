import { NextResponse, type NextRequest } from 'next/server';

// The function signature is updated to correctly handle the params promise.
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  try {
    // We now correctly await the promise to get the params object.
    const params = await context.params;
    const { token } = params;
    
    const gatewayUrl = process.env.API_GATEWAY_URL || 'http://localhost:3000';
    const appBaseUrl = process.env.APP_BASE_URL || 'http://localhost:3001';

    // 1. Forward the verification request to your API Gateway
    const gatewayResponse = await fetch(`${gatewayUrl}/api/verify-email-change/${token}`, {
      method: 'GET',
    });

    // 2. Based on the gateway's JSON response, redirect the user's browser
    if (gatewayResponse.ok) {
      // On success, redirect to the login page with a success message
      return NextResponse.redirect(`${appBaseUrl}/login?emailChanged=true`);
    } else {
      // On failure, get the error message and redirect to the register page
      const errorData = await gatewayResponse.json();
      const errorMessage = encodeURIComponent(errorData.error || 'Verification failed.');
      return NextResponse.redirect(`${appBaseUrl}/register?error=${errorMessage}`);
    }

  } catch (error) {
    console.error('Error proxying email change verification:', error);
    const appBaseUrl = process.env.APP_BASE_URL || 'http://localhost:3001';
    return NextResponse.redirect(`${appBaseUrl}/register?error=An+unexpected+error+occurred.`);
  }
}