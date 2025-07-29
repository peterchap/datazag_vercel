import { 
  createContext, 
  useContext, 
  useState, 
  useEffect, 
  ReactNode,
  useCallback
} from "react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, UseMutationResult } from "@tanstack/react-query";
import { USER_ROLES } from "@shared/schema";
// Import API gateway functions
import { loginViaGateway, registerViaGateway } from "@/lib/api-client";

interface User {
  id: number;
  firstName: string;
  lastName: string;
  username?: string; // Optional for backward compatibility
  email: string;
  company: string;
  credits: number;
  role: string;
  canPurchaseCredits?: boolean; // Permission to purchase credits (defaults to true for admins)
}

type LoginData = {
  email: string;
  password: string;
};

interface RegisterData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  company: string; // Required company field
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (userData: RegisterData) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isBusinessAdmin: boolean;
  isClientAdmin: boolean;
  isRegularUser: boolean;
  loginMutation: UseMutationResult<User, Error, LoginData>;
  registerMutation: UseMutationResult<User, Error, RegisterData>;
  logoutMutation: UseMutationResult<void, Error, void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const router = useRouter();

  // Token expiry utilities
  const isTokenExpired = (timestamp: number): boolean => {
    const now = Date.now();
    const oneHour = 60 * 60 * 1000; // 1 hour in milliseconds
    return (now - timestamp) > oneHour;
  };

  const clearExpiredSession = (): void => {
    localStorage.removeItem('currentUser');
    localStorage.removeItem('authTimestamp');
    setUser(null);
    console.log("Session expired - cleared local storage");
  };

  // Check authentication status with server session
  useEffect(() => {
    const checkAuth = async () => {
      try {
        console.log("Checking authentication status...");
        
        console.log("Auth check URL:", "/api/me");
        console.log("API Gateway URL env:", process.env.NEXT_PUBLIC_API_GATEWAY_URL || 'not set');
        
        const response = await apiRequest('GET', '/api/me');
        
        const userData = await response.json();
        if (userData && userData.id) {
          console.log("Server session valid, user:", userData.email);
          setUser(userData);
          localStorage.setItem('currentUser', JSON.stringify(userData));
          localStorage.setItem('authTimestamp', Date.now().toString());
        } else {
          console.log("No active server session");
          setUser(null);
          localStorage.removeItem('currentUser');
          localStorage.removeItem('authTimestamp');
        }
      } catch (error) {
        console.error("Auth check failed:", error);
        // For 401 errors, this is expected when not authenticated
        if (error instanceof Error && !error.message?.includes('401')) {
          console.error("Unexpected auth error:", error);
        }
        setUser(null);
        localStorage.removeItem('currentUser');
        localStorage.removeItem('authTimestamp');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();

    // Set up periodic session validation with server (check every 5 minutes)
    const sessionCheckInterval = setInterval(async () => {
      try {
        const response = await fetch('/api/me', {
          credentials: 'include',
          headers: { 'Accept': 'application/json' }
        });
        
        if (!response.ok) {
          console.log("Session expired on server");
          setUser(null);
          localStorage.removeItem('currentUser');
          localStorage.removeItem('authTimestamp');
          toast({
            title: "Session Expired",
            description: "Please log in again to continue",
            variant: "destructive",
          });
          router.push("/auth");
        }
      } catch (error) {
        console.error("Session check failed:", error);
      }
    }, 5 * 60 * 1000); // Check every 5 minutes

    return () => clearInterval(sessionCheckInterval);
  }, [toast, router]);

  // Login mutation using session-based auth
  const loginMutation = useMutation<User, Error, LoginData>({
    mutationFn: async (credentials: LoginData) => {
      console.log("Attempting login with email:", credentials.email);
      
      const apiGatewayUrl = process.env.NEXT_PUBLIC_API_GATEWAY_URL;
      const loginUrl = apiGatewayUrl ? `${apiGatewayUrl}/api/login` : '/api/login';
      
      const response = await fetch(loginUrl, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(credentials)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Login failed');
      }
      
      return await response.json();
    },
    onSuccess: (userData) => {
      console.log("Login successful, user data:", userData);
      setUser(userData);
      queryClient.invalidateQueries({ queryKey: ["/api/me"] });
      
      // Store user data and authentication timestamp
      localStorage.setItem('currentUser', JSON.stringify(userData));
      localStorage.setItem('authTimestamp', Date.now().toString());
      
      // Navigate based on user role
      setTimeout(() => {
        try {
          const userRole = userData.role ? userData.role.toLowerCase() : '';
          if (userRole && 
              (userRole === 'business_admin' || userRole === 'client_admin' || userRole === 'admin')) {
            router.push("/admin/dashboard");
          } else {
            router.push("/dashboard");
          }
        } catch (error) {
          console.error("Role navigation error:", error);
          router.push("/dashboard"); // Default fallback
        }
      }, 200);
      
      // Create a friendly display name from first and last name
      const displayName = userData.firstName && userData.lastName 
                         ? `${userData.firstName} ${userData.lastName}` 
                         : userData.email;
                       
      toast({
        title: "Login successful",
        description: `Welcome back, ${displayName}!`,
      });
    },
    onError: (error) => {
      console.error("Login error:", error);
      toast({
        title: "Login failed",
        description: error.message || "Please check your credentials and try again.",
        variant: "destructive",
      });
    }
  });

  // Register mutation
  const registerMutation = useMutation<User, Error, RegisterData>({
    mutationFn: async (userData: RegisterData) => {
      console.log("Registration attempt with data:", {
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        company: userData.company
      });
      
      console.log("Sending POST request to", (process.env.NEXT_PUBLIC_API_GATEWAY_URL || '') + "/api/register");
      
      // Use registerViaGateway to properly route through API Gateway
      return await registerViaGateway({
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email,
        password: userData.password,
        company: userData.company
      });
    },
    onSuccess: (userData) => {
      console.log("Registration successful, user data:", userData);
      setUser(userData);
      queryClient.invalidateQueries({ queryKey: ["/api/me"] });
      
      // Store user data and authentication timestamp
      localStorage.setItem('currentUser', JSON.stringify(userData));
      localStorage.setItem('authTimestamp', Date.now().toString());
      
      toast({
        title: "Registration successful",
        description: `Welcome to Datazag, ${userData.firstName}!`,
      });
      
      // Navigate based on user role
      setTimeout(() => {
        try {
          const userRole = userData.role ? userData.role.toLowerCase() : '';
          if (userRole && 
              (userRole === 'business_admin' || userRole === 'client_admin' || userRole === 'admin')) {
            router.push("/admin/dashboard");
          } else {
            router.push("/dashboard");
          }
        } catch (error) {
          console.error("Role navigation error:", error);
          router.push("/dashboard"); // Default fallback
        }
      }, 1000);
    },
    onError: (error) => {
      console.error("Registration error:", error);
      toast({
        title: "Registration failed",
        description: error.message || "Please check your information and try again.",
        variant: "destructive",
      });
    }
  });
  
  // Logout mutation
  const logoutMutation = useMutation<void, Error, void>({
    mutationFn: async () => {
      const apiGatewayUrl = process.env.NEXT_PUBLIC_API_GATEWAY_URL;
      const logoutUrl = apiGatewayUrl ? `${apiGatewayUrl}/api/logout` : '/api/logout';
      
      const response = await fetch(logoutUrl, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Accept': 'application/json'
        }
      });
      
      // Clear local storage regardless of response
      localStorage.removeItem('currentUser');
      localStorage.removeItem('authTimestamp');
      
      if (!response.ok) {
        console.warn('Logout request failed, but cleared local data');
      }
    },
    onSuccess: () => {
      setUser(null);
      queryClient.clear();
      toast({
        title: "Logged out",
        description: "You have been successfully logged out.",
      });
      router.push("/login");
    },
    onError: (error) => {
      toast({
        title: "Logout failed",
        description: error.message || "Something went wrong.",
        variant: "destructive",
      });
    }
  });

  // Refresh user data function
  const refreshUser = useCallback(async (): Promise<void> => {
    try {
      console.log("Refreshing user data...");
      const response = await apiRequest('GET', '/api/me');
      const userData = await response.json();
      
      if (userData && userData.id) {
        console.log("User data refreshed:", userData.email, "Credits:", userData.credits);
        setUser(userData);
        localStorage.setItem('currentUser', JSON.stringify(userData));
        localStorage.setItem('authTimestamp', Date.now().toString());
      }
    } catch (error) {
      console.error("Failed to refresh user data:", error);
    }
  }, []);

  // Listen for custom refresh events
  useEffect(() => {
    const handleRefreshUser = () => {
      refreshUser();
    };
    
    window.addEventListener('refreshUserData', handleRefreshUser);

    return () => {
      window.removeEventListener('refreshUserData', handleRefreshUser);
    };
  }, [refreshUser]);

  // Legacy methods for backwards compatibility
  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      await loginMutation.mutateAsync({ email, password });
      return true;
    } catch (error) {
      return false;
    }
  };

  const register = async (userData: RegisterData): Promise<boolean> => {
    try {
      await registerMutation.mutateAsync(userData);
      return true;
    } catch (error) {
      return false;
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await logoutMutation.mutateAsync();
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  // Role checking helpers - safe access to role property
  const isAdmin: boolean = !!user && !!user.role && (
    user.role.toLowerCase() === USER_ROLES.BUSINESS_ADMIN || 
    user.role.toLowerCase() === USER_ROLES.CLIENT_ADMIN
  );
  
  const isBusinessAdmin: boolean = !!user && !!user.role && user.role.toLowerCase() === USER_ROLES.BUSINESS_ADMIN;
  const isClientAdmin: boolean = !!user && !!user.role && user.role.toLowerCase() === USER_ROLES.CLIENT_ADMIN;
  const isRegularUser: boolean = !!user && !!user.role && user.role.toLowerCase() === USER_ROLES.USER;

  // Log current user role info
  if (user) {
    console.log("Current user:", user);
    console.log("User role:", user.role);
    console.log("Is business admin?", isBusinessAdmin);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        refreshUser,
        isAuthenticated: !!user,
        isAdmin: isAdmin,
        isBusinessAdmin: isBusinessAdmin,
        isClientAdmin: isClientAdmin,
        isRegularUser: isRegularUser,
        loginMutation,
        registerMutation,
        logoutMutation
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
