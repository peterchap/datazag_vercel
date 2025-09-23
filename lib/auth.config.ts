// auth.config.ts
import type { NextAuthConfig } from 'next-auth';
import Credentials from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import GitHubProvider from "next-auth/providers/github";

// NOTICE: We are NOT initializing the Drizzle adapter here.
// We are also NOT using the database (db) instance.

export const authConfig = {
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
  providers: [
    // You can define your providers here, but the 'authorize' function for credentials
    // should NOT access the database directly if you want this config to be fully Edge-compatible.
    // For simplicity, we can leave them in the main file and just define callbacks here.
    // Or, you can define them here and handle DB logic in the main file.
    // For now, let's keep providers in the main file and just define the callbacks.
  ],
  callbacks: {
    // This jwt callback is Edge-compatible as it only works with the token.
    async jwt({ token, user }) {
      if (user) {
        if (user.id) {
          token.sub = user.id;
        }
        token.role = user.role;
      }
      return token;
    },
    // This session callback is also Edge-compatible.
    async session({ session, token }) {
      if (token.sub && session.user) {
        session.user.id = token.sub;
        session.user.role = token.role as string;
      }
      return session;
    },
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isProtectedRoute = nextUrl.pathname.startsWith('/dashboard');

      if (isProtectedRoute) {
        if (isLoggedIn) return true; // Allow access if logged in
        return false; // Redirect unauthenticated users to login page
      } else if (isLoggedIn) {
        // If user is logged in and tries to access login/register, redirect to dashboard
        if (nextUrl.pathname === '/login' || nextUrl.pathname === '/register') {
           return Response.redirect(new URL('/dashboard', nextUrl));
        }
      }
      return true; // Allow all other requests
    },
  },
} satisfies NextAuthConfig;