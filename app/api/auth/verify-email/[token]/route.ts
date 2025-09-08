// app/api/auth/verify-email/[token]/route.ts
import { NextResponse, type NextRequest } from 'next/server';

// This is the new API route that the email verification link will call.
export async function GET(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params;
    const gatewayUrl = process.env.API_GATEWAY_URL || 'http://localhost:3000';
    const appBaseUrl = process.env.APP_BASE_URL || 'http://localhost:3001';

    // 1. Forward the verification request to your API Gateway
    const gatewayResponse = await fetch(`${gatewayUrl}/api/verify-email/${token}`, {
      method: 'GET',
    });

    // 2. Based on the gateway's JSON response, redirect the user's browser
    if (gatewayResponse.ok) {
      // On success, redirect to the login page with a success message
      return NextResponse.redirect(`${appBaseUrl}/login?verified=true`);
    } else {
      // On failure, get the error message and redirect to the register page
      const errorData = await gatewayResponse.json();
      const errorMessage = encodeURIComponent(errorData.error || 'Verification failed.');
      return NextResponse.redirect(`${appBaseUrl}/register?error=${errorMessage}`);
    }

  } catch (error) {
    console.error('Error proxying email verification:', error);
    const appBaseUrl = process.env.APP_BASE_URL || 'http://localhost:3001';
    return NextResponse.redirect(`${appBaseUrl}/register?error=An+unexpected+error+occurred.`);
  }
}