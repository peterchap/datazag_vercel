import type { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import GitHubProvider from 'next-auth/providers/github'
import CredentialsProvider from 'next-auth/providers/credentials'
import { db } from '@/server/db'
import { users } from '@/shared/schema'
import { eq } from 'drizzle-orm'
import bcrypt from 'bcrypt'
import { pool } from './db'

// Helper to extract user ID from Authorization Bearer token
export async function getUserFromBearerToken(request: Request): Promise<{ userId: number; error?: string } | null> {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { userId: 0, error: 'Missing or invalid Authorization header' };
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    // Check if token is an API key format (datazag_*)
    if (token.startsWith('datazag_')) {
      // Look up user by API key
      const client = await pool.connect();
      try {
        const result = await client.query(
          'SELECT ak.user_id FROM api_keys ak WHERE ak.api_key = $1 AND ak.active = true',
          [token]
        );
        
        if (result.rows.length === 0) {
          return { userId: 0, error: 'Invalid or inactive API key' };
        }
        
        return { userId: result.rows[0].user_id };
      } finally {
        client.release();
      }
    }
    
    // For other token formats, you could add JWT validation here
    // For now, return error for unsupported token format
    return { userId: 0, error: 'Unsupported token format' };
    
  } catch (error) {
    console.error('Error extracting user from bearer token:', error);
    return { userId: 0, error: 'Authentication error' };
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    // Only add Google provider if credentials are available
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET ? [
      GoogleProvider({
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      })
    ] : []),
    
    // Only add GitHub provider if credentials are available
    ...(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET ? [
      GitHubProvider({
        clientId: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
      })
    ] : []),
    
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const user = await db
          .select()
          .from(users)
          .where(eq(users.email, credentials.email))
          .limit(1)

        if (!user[0]) {
          return null
        }

        const isValidPassword = await bcrypt.compare(
          credentials.password,
          user[0].password
        )

        if (!isValidPassword) {
          return null
        }

        return {
          id: user[0].id.toString(),
          email: user[0].email,
          name: `${user[0].firstName} ${user[0].lastName}`,
          role: user[0].role,
        }
      }
    })
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === 'google' || account?.provider === 'github') {
        // Handle OAuth sign in
        const email = user.email!
        
        // Check if user exists
        const existingUser = await db
          .select()
          .from(users)
          .where(eq(users.email, email))
          .limit(1)

        if (existingUser[0]) {
          // Update OAuth ID if not set
          const oauthField = account.provider === 'google' ? 'googleId' : 'githubId'
          await db
            .update(users)
            .set({ [oauthField]: account.providerAccountId })
            .where(eq(users.id, existingUser[0].id))
          
          return true
        }
        
        return false // Don't auto-create users, require registration
      }
      
      return true
    },
    async session({ session, token }) {
      if (token.sub) {
        const user = await db
          .select()
          .from(users)
          .where(eq(users.id, parseInt(token.sub)))
          .limit(1)

        if (user[0]) {
          session.user = {
            ...session.user,
            id: user[0].id.toString(),
            role: user[0].role,
            credits: user[0].credits,
            company: user[0].company,
          }
        }
      }
      
      return session
    },
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id
      }
      return token
    },
  },
  pages: {
    signIn: '/login',
    error: '/auth/error',
  },
  session: {
    strategy: 'jwt',
  },
}
