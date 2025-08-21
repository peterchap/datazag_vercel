import NextAuth, { type NextAuthOptions } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';
import GitHubProvider from 'next-auth/providers/github';
import { pool } from '@/lib/drizzle';
import bcrypt from 'bcryptjs';

// Build providers list conditionally so build doesn't fail and UI can reflect availability
const providers: NextAuthOptions['providers'] = [];

providers.push(
  Credentials({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      authorize: async (creds) => {
        if (!creds?.email || !creds?.password) return null;
        const client = await pool.connect();
        try {
          // Use existing schema column name `password` (stored hashed)
          const { rows } = await client.query(
            'SELECT id, email, password AS password_hash, role, credits, first_name, last_name, password_reset_token FROM users WHERE email = $1',
            [creds.email.toLowerCase()]
          );
          const user = rows[0];
          if (!user?.password_hash) return null;
          const valid = await bcrypt.compare(creds.password, user.password_hash);
          if (!valid) return null;
          // If flagged for reset, return a marker and do not complete normal login
          if (user.password_reset_token) {
            return {
              id: String(user.id),
              email: user.email,
              role: user.role,
              credits: user.credits,
              firstName: user.first_name,
              lastName: user.last_name,
              forcePasswordReset: true,
            } as any;
          }
          // Update lastLogin timestamp best-effort (ignore failures)
          try {
            await client.query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);
          } catch {}
          return {
            id: String(user.id),
            email: user.email,
            role: user.role,
            credits: user.credits,
            firstName: user.first_name,
            lastName: user.last_name,
          };
        } finally {
          client.release();
        }
      },
    })
);

const githubId = process.env.GITHUB_ID || process.env.NEXT_PUBLIC_GITHUB_ID;
const githubSecret = process.env.GITHUB_SECRET || process.env.NEXT_PUBLIC_GITHUB_SECRET;
if (githubId && githubSecret) {
  providers.push(GitHubProvider({ clientId: githubId, clientSecret: githubSecret }));
} else {
  if (process.env.NODE_ENV !== 'production') {
    console.warn('[auth] GitHub provider disabled: missing GITHUB_ID/GITHUB_SECRET');
  }
}

const googleId = process.env.OAUTH_GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
const googleSecret = process.env.OAUTH_GOOGLE_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_SECRET;
if (googleId && googleSecret) {
  providers.push(Google({
    clientId: googleId,
    clientSecret: googleSecret,
    allowDangerousEmailAccountLinking: true,
  }));
} else {
  if (process.env.NODE_ENV !== 'production') {
    console.warn('[auth] Google provider disabled: missing OAUTH_GOOGLE_CLIENT_ID / OAUTH_GOOGLE_CLIENT_SECRET');
  }
}

export const authOptions: NextAuthOptions = {
  session: { strategy: 'jwt' },
  providers,
  callbacks: {
  async jwt({ token, user }) {
      if (user) {
        token.uid = user.id;
        token.role = (user as any).role ?? 'USER';
        token.credits = (user as any).credits ?? 0;
    if ((user as any).forcePasswordReset) token.forcePasswordReset = true;
      }
      return token;
    },
  async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.uid;
        (session.user as any).role = token.role;
        (session.user as any).credits = token.credits;
    (session.user as any).forcePasswordReset = (token as any).forcePasswordReset || false;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET,
};

export const { auth } = NextAuth(authOptions);