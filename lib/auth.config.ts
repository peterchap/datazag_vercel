// auth.config.ts
import type { NextAuthConfig } from 'next-auth';

export const authConfig = {
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
  providers: [],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        if (user.id) {
          token.sub = user.id;
        }
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (token.sub && session.user) {
        session.user.id = token.sub;
        session.user.role = token.role as string;
      }
      return session;
    },
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const { pathname } = nextUrl;
      
      // Handle root path
      if (pathname === '/') {
        if (isLoggedIn) {
          return Response.redirect(new URL('/dashboard', nextUrl));
        }
        return Response.redirect(new URL('/login', nextUrl));
      }

      // Protected routes (dashboard, etc.)
      const isProtectedRoute = pathname.startsWith('/dashboard');
      
      if (isProtectedRoute) {
        if (isLoggedIn) return true;
        return false; // Redirect to login
      }

      // If logged in and trying to access login/register, redirect to dashboard
      if (isLoggedIn && (pathname === '/login' || pathname === '/register')) {
        return Response.redirect(new URL('/dashboard', nextUrl));
      }

      return true; // Allow all other requests
    },
  },
} satisfies NextAuthConfig;