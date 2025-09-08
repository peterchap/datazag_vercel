"use client";
import {
  createContext,
  useContext,
  ReactNode,
  useCallback,
  useMemo
} from 'react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { signIn, signOut, useSession } from 'next-auth/react';
import { registerViaGateway } from '@/lib/api-client';
import { USER_ROLES } from '@/shared/schema';

// Define the shape of your user object, consistent with your session
interface User {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  company?: string;
  credits?: number;
  role?: string;
  canPurchaseCredits?: boolean;
}

interface RegisterData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  company: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  refetchUser: () => void;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data: session, status, update } = useSession();
  const { toast } = useToast();
  const router = useRouter();

  // The user object is now derived directly from the NextAuth session,
  // making it the single source of truth.
  const user = (session?.user as User) || null;
  const isAuthenticated = status === 'authenticated';
  const loading = status === 'loading';

  // Role checking helpers are now simpler and more direct.
  const isAdmin = user?.role === USER_ROLES.BUSINESS_ADMIN || user?.role === USER_ROLES.CLIENT_ADMIN;

  const refetchUser = useCallback(() => {
    // 'update' is the function provided by useSession to refresh session data.
    // This is the correct and modern way to force a refresh.
    update();
  }, [update]);

  const register = async (data: RegisterData) => {
    try {
      await registerViaGateway(data);
      // After successful registration in your gateway, we sign the user in.
      const signInResponse = await signIn('credentials', {
        redirect: false, // We handle the redirect manually after the toast.
        email: data.email,
        password: data.password,
      });

      if (signInResponse?.error) {
        throw new Error(signInResponse.error);
      }
      
      toast({ title: "Registration Successful", description: "Welcome! You are now being redirected." });
      // The server-side middleware will handle redirecting to the correct dashboard.
      router.push('/'); 
    } catch (error: any) {
      toast({ title: "Registration Failed", description: error.message || "An error occurred.", variant: "destructive" });
      throw error; // Re-throw for the component's form state to handle.
    }
  };

  const logout = async () => {
    // Let next-auth handle the session termination and redirect.
    await signOut({ redirect: true, callbackUrl: '/login' });
    toast({ title: "Logged Out", description: "You have been successfully logged out." });
  };
  
  // By using useMemo, we ensure the context value only changes when necessary,
  // preventing unnecessary re-renders in your application.
  const value = useMemo(() => ({
    user,
    loading,
    isAuthenticated,
    isAdmin,
    refetchUser,
    register,
    logout,
  }), [user, loading, isAuthenticated, isAdmin, refetchUser, register, logout]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}