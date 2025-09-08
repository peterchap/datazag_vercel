import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ApiKeysClient } from "@/components/api-keys/api-keys-client";
import type { ApiKey } from "@/components/api-keys/api-keys-client"; // Assuming you export this type

// This helper function now securely calls your API Gateway with an auth token.
async function fetchKeysFromGateway(jwt: string) {
  const gatewayUrl = process.env.API_GATEWAY_URL || 'http://localhost:3000';

  try {
    const response = await fetch(`${gatewayUrl}/api/api-keys`, {
      method: 'GET',
      headers: {
        // This is the crucial fix: we include the user's JWT
        // in the Authorization header to authenticate the request.
        'Authorization': `Bearer ${jwt}`, 
      },
      cache: 'no-store', // Ensure we always get the latest data
    });

    if (!response.ok) {
      // If the gateway returns an error (like 401 Unauthorized), we throw an error.
      throw new Error(`Failed to fetch API keys: ${response.statusText}`);
    }

    return await response.json();

  } catch (error) {
    console.error("Error fetching from API gateway:", error);
    return []; // Return an empty array on error to prevent the page from crashing.
  }
}

// This is the updated Server Component for your API Keys page.
export default async function ApiKeysPage() {
  const session = await auth();
  
  // 1. Secure the page and get the JWT token.
  if (!session?.user?.id || !session.jwt) {
    redirect("/login");
  }

  // 2. Fetch the initial list of API keys from your gateway, passing the token.
  const initialApiKeys = await fetchKeysFromGateway(session.jwt);

  // 3. Render your client component, passing the gateway data as props.
  return <ApiKeysClient initialApiKeys={initialApiKeys as ApiKey[]} />;
}