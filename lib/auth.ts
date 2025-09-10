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
  adapter: DrizzleAdapter(db),
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    // ... (your Google and GitHub providers) ...
    Credentials({
      name: "Credentials",
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
            // This now throws a specific error that will be shown to the user.
            throw new Error("Please enter your email and password.");
        }

        const user = await db.query.users.findFirst({
          where: eq(users.email, String(credentials.email).toLowerCase()),
        });

        if (!user) {
          // For security, it's best not to reveal if the user exists,
          // but we throw a clear error.
          throw new Error("Invalid email or password.");
        }

        if (!user.password) {
            throw new Error("This account is for social sign-in only.");
        }

        const isValid = await bcrypt.compare(String(credentials.password), user.password);
        
        if (!isValid) {
          throw new Error("Invalid email or password."); // Same generic message for security
        }
        
        // ... (rest of your successful login logic)
        
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
    async signIn({ user, account, profile }) {
      // For social logins (OAuth), we need to check if the user exists and,
      // if not, create them in our database.
      if (account?.provider === "google" || account?.provider === "github") {
        const email = user.email;
        if (!email) return false; // Social accounts must provide an email.

        try {
          // Check if a user with this email already exists
          let existingUser = await db.query.users.findFirst({
            where: eq(users.email, email),
          });

          if (!existingUser) {
            // If the user doesn't exist, create a new one.
            const [firstName, ...lastNameParts] = user.name?.split(" ") || ["", ""];
            const lastName = lastNameParts.join(" ");

            const [newUser] = await db.insert(users).values({
              firstName: firstName,
              lastName: lastName,
              email: email,
              emailVerified: true, // OAuth emails are considered verified
              // You might generate a placeholder password or handle this differently
              password: await bcrypt.hash(`oauth-${Date.now()}`, 10),
              company: "Default Company", // Or prompt for this after signup
            }).returning();
            
            existingUser = newUser;
          }
          
          // Link the user's ID to the session to ensure they are logged in
          user.id = existingUser.id.toString();
          return true;

        } catch (error) {
          console.error("OAuth signIn callback error:", error);
          return false; // Prevent sign-in on error
        }
      }
      return true; // Allow standard credential logins to proceed
    },
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