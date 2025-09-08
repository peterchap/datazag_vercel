import type { User } from "@/shared/schema"; // Assuming a shared User type

/**
 * Fetches the list of users belonging to the same company as the
 * currently authenticated client admin.
 * @param jwt The client admin's JWT token for authentication.
 * @returns An array of user objects.
 */
export async function fetchCompanyUsers(jwt: string): Promise<User[]> {
  const gatewayUrl = process.env.API_GATEWAY_URL || 'http://localhost:3000';

  try {
    // This makes a secure, server-to-server call to your API Gateway.
    const response = await fetch(`${gatewayUrl}/api/client-admin/company-users`, {
      method: 'GET',
      headers: {
        // We include the client admin's JWT to authenticate the request.
        'Authorization': `Bearer ${jwt}`, 
      },
      // Ensure we always get the latest data, not a cached version.
      cache: 'no-store',
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `Failed to fetch company users: ${response.statusText}`);
    }

    return await response.json();

  } catch (error) {
    console.error("Error fetching company users from gateway:", error);
    return []; // Return an empty array on error to prevent the page from crashing.
  }
}