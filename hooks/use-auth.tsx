import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback
} from 'react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { queryClient } from '@/lib/queryClient';
import { useRouter } from 'next/navigation';
// Removed react-query; using simple async handlers
import { USER_ROLES } from '@shared/schema';
import { signIn, signOut, useSession } from 'next-auth/react';
import { registerViaGateway } from '@/lib/api-client';

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
  loginMutation: any;
  registerMutation: any;
  logoutMutation: any;
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

  // Refresh user data function (declared early so hooks can reference)
  const refreshUser = useCallback(async (): Promise<void> => {
    try {
      const response = await apiRequest('GET', '/api/me');
      const userData = await response.json();
      if (userData && userData.id) {
        setUser(userData);
        localStorage.setItem('currentUser', JSON.stringify(userData));
        localStorage.setItem('authTimestamp', Date.now().toString());
      }
    } catch (error) {
      console.error('Failed to refresh user data:', error);
    }
  }, []);

  // Leverage NextAuth session; fall back to /api/me for enriched fields like credits
  // Guard: in some prerender/build contexts useSession may return undefined object; provide fallback
  const sessionHook = useSession();
  const status = sessionHook?.status as typeof sessionHook.status | undefined;
  const session = sessionHook?.data;

  useEffect(() => {
    const primeFromSession = async () => {
      if (status === 'loading') return;
      if (status === 'unauthenticated') {
        setUser(null);
        setLoading(false);
        localStorage.removeItem('currentUser');
        localStorage.removeItem('authTimestamp');
        return;
      }
      try {
        // Fetch /api/me to ensure we have latest credits / role
        const res = await fetch('/api/me', { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          setUser(data);
          localStorage.setItem('currentUser', JSON.stringify(data));
          localStorage.setItem('authTimestamp', Date.now().toString());
        } else {
          setUser(null);
        }
      } catch (e) {
        console.error('Initial auth sync failed', e);
      } finally {
        setLoading(false);
      }
    };
    primeFromSession();
  }, [status]);

  // Periodic refresh of credits (5 min) only if authenticated
  useEffect(() => {
    if (!user) return;
    const id = setInterval(() => refreshUser(), 5 * 60 * 1000);
    return () => clearInterval(id);
  }, [user, refreshUser]);

  // Login mutation using session-based auth
  const loginMutation = {
    mutateAsync: async (credentials: LoginData) => {
      const res = await signIn('credentials', {
        redirect: false,
        email: credentials.email,
        password: credentials.password,
      });
      if (res?.error) throw new Error(res.error || 'Login failed');
      // Re-fetch current user from /api/me
      const me = await fetch('/api/me');
      if (!me.ok) throw new Error('Failed to load user after login');
      const userData = await me.json();
      setUser(userData);
      localStorage.setItem('currentUser', JSON.stringify(userData));
      localStorage.setItem('authTimestamp', Date.now().toString());
      const userRole = userData.role?.toLowerCase();
      router.push(userRole && (userRole.includes('admin')) ? '/admin/dashboard' : '/dashboard');
      toast({ title: 'Login successful', description: `Welcome back, ${userData.firstName || userData.email}!` });
      return userData;
    }
  };

  // Register mutation
  const registerMutation = {
    mutateAsync: async (userData: RegisterData) => {
      console.log("Registration attempt with data:", {
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        company: userData.company
      });
      
      console.log("Sending POST request to", (process.env.NEXT_PUBLIC_API_GATEWAY_URL || '') + "/api/register");
      
      // Use registerViaGateway to properly route through API Gateway
      const result = await registerViaGateway({
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email,
        password: userData.password,
        company: userData.company
      });
  console.log("Registration successful, user data:", result);
  // Normalize id to number for User type
  const normalizedUser = { ...result, id: Number(result.id) } as unknown as User;
  setUser(normalizedUser);
      queryClient.invalidateQueries({ queryKey: ["/api/me"] });
      
      // Store user data and authentication timestamp
  localStorage.setItem('currentUser', JSON.stringify(normalizedUser));
      localStorage.setItem('authTimestamp', Date.now().toString());
      
      toast({
        title: "Registration successful",
        description: `Welcome to Datazag, ${result.firstName}!`,
      });
      
      // Navigate based on user role
      setTimeout(() => {
        try {
          const userRole = normalizedUser.role ? normalizedUser.role.toLowerCase() : '';
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
      return result;
    }
  };
  
  // Logout mutation
  const logoutMutation = {
    mutateAsync: async () => {
      await signOut({ redirect: false });
      // hit compat endpoint (no-op) if legacy callers rely on network success
      fetch('/api/logout', { method: 'POST' }).catch(() => undefined);
      localStorage.removeItem('currentUser');
      localStorage.removeItem('authTimestamp');
      // onSuccess actions
      setUser(null);
      queryClient.clear();
      toast({ title: 'Logged out', description: 'You have been successfully logged out.' });
      router.push('/login');
    }
  };


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
  const role = user?.role?.toLowerCase();
  const isBusinessAdmin = role === USER_ROLES.BUSINESS_ADMIN;
  const isClientAdmin = role === USER_ROLES.CLIENT_ADMIN;
  const isRegularUser = role === USER_ROLES.USER;
  const isAdmin = isBusinessAdmin || isClientAdmin;

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
