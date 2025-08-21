// Lightweight API helper. React Query has been removed.

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

function getAuthToken(): string | null {
  try {
    if (typeof window === 'undefined') return null;
    // Common places to store JWT
    const lsKeys = ['token', 'auth_token', 'jwt', 'access_token'];
    for (const k of lsKeys) {
      const v = window.localStorage?.getItem?.(k);
      if (v) return v;
    }
    // Try cookie named token
    const m = document.cookie.match(/(?:^|; )token=([^;]+)/);
    if (m) return decodeURIComponent(m[1]);
  } catch {}
  return null;
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
  isFormData: boolean = false,
): Promise<Response> {
  // Build full URL against API gateway when a relative path is provided
  let fullUrl: string = url;
  const base = (typeof process !== 'undefined' && (process as any).env?.NEXT_PUBLIC_API_GATEWAY_URL) || '';
  const forceGateway = (typeof process !== 'undefined' && (process as any).env?.NEXT_PUBLIC_FORCE_GATEWAY) === 'true';
  const isBrowser = typeof window !== 'undefined';
  const isLocalNextApi = (u: string) => {
    // Keep these on same-origin to hit Next route handlers, not the gateway directly
  return /^\/api\/(claim-free-bundle($|\/)|auth(\/|$)|notifications(\/|$)|api-keys(\/|$))/.test(u);
  };
  if (!url.startsWith('http')) {
    // In the browser, always use relative paths to leverage Next rewrites and avoid CORS.
    // On the server, prefix non-local API routes with the gateway base if provided.
    if (!isBrowser && base && !isLocalNextApi(url)) {
      fullUrl = `${base.replace(/\/$/, '')}${url.startsWith('/') ? url : `/${url}`}`;
    } else {
      // Optionally allow forcing the gateway absolute URL in the browser for diagnostics/routing control
      if (isBrowser && base && forceGateway && !isLocalNextApi(url)) {
        fullUrl = `${base.replace(/\/$/, '')}${url.startsWith('/') ? url : `/${url}`}`;
      } else {
        fullUrl = url;
      }
    }
  }
  
  console.log(`API Request: ${method} ${fullUrl}`, { 
    data: data ? "present" : "none",
    forcedRelative: "true"
  });
  
  // Session-based authentication - no tokens needed
  // Cookies are automatically included with credentials: "include"
  
  // Set up request options based on data type
  const requestOptions: RequestInit = {
    method,
    credentials: "include", // Include cookies in the request
    headers: {
      // Add default headers here
      "Accept": "application/json",
      // Session-based auth - no authorization header needed
    } as HeadersInit
  };

  // Attach Bearer token if available
  const token = getAuthToken();
  if (token) {
    (requestOptions.headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  // Also attach token as a cookie for backends that read cookies
  const existingCookie = (requestOptions.headers as Record<string, string>)["Cookie"];
  const cookieVal = `token=${encodeURIComponent(token)}`;
  (requestOptions.headers as Record<string, string>)["Cookie"] = existingCookie ? `${existingCookie}; ${cookieVal}` : cookieVal;
  }

  // Handle different data types
  if (data) {
    if (isFormData) {
      // FormData should be sent without Content-Type to ensure browser sets correct boundary
      requestOptions.body = data as FormData;
      console.log("Sending FormData");
    } else {
      // JSON data
      (requestOptions.headers as Record<string, string>)["Content-Type"] = "application/json";
      requestOptions.body = JSON.stringify(data);
      console.log("Sending JSON data");
    }
  }

  console.log("Request options:", {
    method: requestOptions.method,
    headers: requestOptions.headers,
    credentials: requestOptions.credentials,
    hasBody: !!requestOptions.body
  });

  try {
  // Add a default timeout to avoid very long hangs
  const controller = new AbortController();
  const timeoutMs = 10000;
  const to = setTimeout(() => controller.abort(), timeoutMs);
  (requestOptions as any).signal = controller.signal;
  const res = await fetch(fullUrl, requestOptions);
  clearTimeout(to);
    console.log(`Response status: ${res.status} ${res.statusText}`);
    
    if (res.ok) {
      console.log("Request successful");
    } else {
      console.warn(`Request failed: ${res.status} ${res.statusText}`);
    }
    
    await throwIfResNotOk(res);
    return res;
  } catch (error) {
    console.error("API request error:", error);
    throw error;
  }
}

// Minimal no-op queryClient to preserve compatibility during migration away from react-query
export const queryClient = {
  invalidateQueries: async (_opts?: any) => {},
  refetchQueries: async (_opts?: any) => {},
  clear: () => {},
};
