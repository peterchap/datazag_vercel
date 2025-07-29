import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
  isFormData: boolean = false,
): Promise<Response> {
  // Always use relative URLs for development - never use external domains
  let fullUrl: string;
  
  if (url.startsWith('http')) {
    fullUrl = url;
  } else {
    // Force relative URLs for local development
    fullUrl = url;
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
    const res = await fetch(fullUrl, requestOptions);
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

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn = <TData>(options: {
  on401?: UnauthorizedBehavior;
  defaultValue?: TData;
} = {}): QueryFunction<TData> => 
  async ({ queryKey }) => {
    console.log(`getQueryFn: Fetching ${queryKey[0]}`);
    const unauthorizedBehavior = options.on401 || "throw";
    const defaultValue = options.defaultValue as TData;
    
    // Session-based authentication - no localStorage tokens needed
    console.log("getQueryFn: Using session-based authentication");
    
    // Always use relative URLs for development
    let fullUrl = queryKey[0] as string;
    
    const requestOptions: RequestInit = {
      credentials: "include",
      headers: {
        "Accept": "application/json",
        // Session-based auth - no authorization header needed
      }
    };
    
    console.log("Query request options:", {
      credentials: requestOptions.credentials,
      headers: requestOptions.headers,
      fullUrl
    });
    
    try {
      const res = await fetch(fullUrl, requestOptions);
      console.log(`getQueryFn: Response status: ${res.status} ${res.statusText} for ${queryKey[0]}`);

      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        console.log(`getQueryFn: Returning null for 401 response to ${queryKey[0]}`);
        return defaultValue !== undefined ? defaultValue : null;
      }

      await throwIfResNotOk(res);
      // Check if the response is empty to avoid JSON parsing errors
      const text = await res.text();
      if (!text || text.trim() === '') {
        console.log(`getQueryFn: Empty response for ${queryKey[0]}`);
        return null;
      }
      
      try {
        const data = JSON.parse(text);
        console.log(`getQueryFn: Successful response for ${queryKey[0]}`, { dataReceivedLength: JSON.stringify(data).length });
        
        // Handle API Gateway response format: { success: true, data: [...] }
        if (data && typeof data === 'object' && data.success && data.data !== undefined) {
          console.log(`getQueryFn: Extracting data from API Gateway response format`);
          return data.data;
        }
        
        return data;
      } catch (parseError) {
        console.error(`getQueryFn: JSON parse error for ${queryKey[0]}:`, parseError, 'Response text:', text.substring(0, 100) + '...');
        // If we can't parse the response as JSON, return null or a default value
        return defaultValue !== undefined ? defaultValue : null;
      }
    } catch (error) {
      console.error(`getQueryFn: Error fetching ${queryKey[0]}:`, error);
      if (defaultValue !== undefined) {
        console.log(`getQueryFn: Returning default value for ${queryKey[0]}`);
        return defaultValue;
      }
      throw error;
    }
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
