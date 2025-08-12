import NextAuth, { type NextAuthOptions } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';
import GitHubProvider from "next-auth/providers/github";
import { pool } from '@/lib/db';
import bcrypt from 'bcryptjs';

export const authOptions: NextAuthOptions = {
  session: { strategy: 'jwt' },
  providers: [
    // Email/password login
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
          const { rows } = await client.query(
            'SELECT id, email, password_hash, role, credits, first_name, last_name FROM users WHERE email = $1',
            [creds.email.toLowerCase()]
          );
          const user = rows[0];
          if (!user?.password_hash) return null;
          const valid = await bcrypt.compare(creds.password, user.password_hash);
          if (!valid) return null;
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
    }),
    // OAuth (enable when you add env vars)
    GitHubProvider({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
    }),
    Google({
      clientId: process.env.OAUTH_GOOGLE_CLIENT_ID ?? '',
      clientSecret: process.env.OAUTH_GOOGLE_CLIENT_SECRET ?? '',
      allowDangerousEmailAccountLinking: true,
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.uid = user.id;
        token.role = (user as any).role ?? 'USER';
        token.credits = (user as any).credits ?? 0;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.uid;
        (session.user as any).role = token.role;
        (session.user as any).credits = token.credits;
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