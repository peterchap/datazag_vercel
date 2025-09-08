import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' }); // Manually load environment variables first

import NextAuth from "next-auth";
import type { NextAuthConfig, DefaultSession } from "next-auth";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/lib/drizzle";
import { users } from "@/shared/schema";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { sign } from 'jsonwebtoken';

import Credentials from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import GitHubProvider from "next-auth/providers/github";

// Extend the default session and user types to include your custom properties
declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id?: string;
      role?: string;
      credits?: number;
      forcePasswordReset?: boolean;
    };
    // This is the raw JWT string for API Gateway communication
    jwt?: string;
  }
  interface User {
    role?: string;
    credits?: number;
    forcePasswordReset?: boolean;
  }
}
// Also augment the JWT token type to hold our custom claims
declare module "next-auth/jwt" {
    interface JWT {
        role?: string;
        credits?: number;
        forcePasswordReset?: boolean;
    }
}

// Define the entire configuration object separately for clarity and type safety.
export const authConfig = {
  // We no longer need the explicit `secret` here as NextAuth will
  // automatically pick up the AUTH_SECRET environment variable.
  adapter: DrizzleAdapter(db),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID ?? (() => { throw new Error("GITHUB_CLIENT_ID is not set"); })(),
      clientSecret: process.env.GITHUB_CLIENT_SECRET ?? (() => { throw new Error("GITHUB_CLIENT_SECRET is not set"); })(),
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? (() => { throw new Error("GOOGLE_CLIENT_ID is not set"); })(),
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? (() => { throw new Error("GOOGLE_CLIENT_SECRET is not set"); })(),
    }),
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email", required: true },
        password: { label: "Password", type: "password", required: true },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await db.query.users.findFirst({
          where: (users, { eq }) => eq(users.email, String(credentials.email).toLowerCase()),
        });

        if (!user || !user.password) return null;

        const isValid = await bcrypt.compare(String(credentials.password), user.password);
        if (!isValid) return null;
        
        try {
          await db.update(users).set({ lastLogin: new Date().toISOString() }).where(eq(users.id, user.id));
        } catch (error) {
            console.error("Failed to update last login:", error);
        }

        return {
            id: user.id.toString(),
            email: user.email,
            role: user.role,
            credits: user.credits,
            forcePasswordReset: !!user.passwordResetToken,
        };
      },
    }),
  ],
  callbacks: {
    // The jwt callback populates the token with custom data.
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.role = user.role;
        token.credits = user.credits;
        token.forcePasswordReset = user.forcePasswordReset;
      }
      return token;
    },
    // The session callback takes the token data and prepares it for the client.
    async session({ session, token }) {
      // Add custom properties to the session.user object
      if (token.sub && session.user) {
        session.user.id = token.sub;
        session.user.role = token.role;
        session.user.credits = token.credits;
        session.user.forcePasswordReset = token.forcePasswordReset;
      }
      
      // Add the encoded JWT to the session object, signing it with the
      // secret that your API Gateway expects.
      (session as any).jwt = sign(token, process.env.JWT_SECRET!);

      return session;
    },
  },
} satisfies NextAuthConfig;

// Pass the configuration object to the main NextAuth function.
export const { handlers, auth, signIn, signOut } = NextAuth(authConfig)