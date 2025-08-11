import type { NextAuthOptions } from 'next-auth';
import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';
import GitHub from 'next-auth/providers/github';
import { pool } from '@/lib/db';
import bcrypt from 'bcryptjs';

async function ensureUserForOAuth(email?: string | null, profile?: any) {
  if (!email) return null;
  const client = await pool.connect();
  try {
    const lower = email.toLowerCase();
    const found = await client.query(
      'SELECT id, email, role, credits, first_name, last_name FROM users WHERE email = $1',
      [lower]
    );
    if (found.rowCount) return found.rows[0];

    const first = profile?.given_name || profile?.firstName || profile?.name?.split?.(' ')?.[0] || null;
    const last =
      profile?.family_name || profile?.lastName || profile?.name?.split?.(' ')?.slice(1)?.join(' ') || null;

    const inserted = await client.query(
      `INSERT INTO users (email, first_name, last_name, role, credits)
       VALUES ($1, $2, $3, 'USER', 1000)
       RETURNING id, email, role, credits, first_name, last_name`,
      [lower, first, last]
    );
    return inserted.rows[0];
  } finally {
    client.release();
  }
}

export const authOptions: NextAuthOptions = {
  session: { strategy: 'jwt' },
  providers: [
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
          const lower = String(creds.email).toLowerCase();
          const { rows } = await client.query(
            'SELECT id, email, password_hash, role, credits, first_name, last_name FROM users WHERE email = $1',
            [lower]
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
          } as any;
        } finally {
          client.release();
        }
      },
    }),
    Google({
      clientId: process.env.OAUTH_GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.OAUTH_GOOGLE_CLIENT_SECRET || '',
      allowDangerousEmailAccountLinking: true,
    }),
    GitHub({
      clientId: process.env.OAUTH_GITHUB_CLIENT_ID || '',
      clientSecret: process.env.OAUTH_GITHUB_CLIENT_SECRET || '',
      allowDangerousEmailAccountLinking: true,
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account && account.provider !== 'credentials') {
        await ensureUserForOAuth(user?.email, profile);
      }
      return true;
    },
    async jwt({ token, user, account }) {
      if (user) {
        token.uid = (user as any).id;
        token.role = (user as any).role ?? 'USER';
        token.credits = (user as any).credits ?? 0;
      } else if (account) {
        const client = await pool.connect();
        try {
          const lower = String(token.email || '').toLowerCase();
          if (lower) {
            const { rows } = await client.query(
              'SELECT id, role, credits FROM users WHERE email = $1',
              [lower]
            );
            const row = rows[0];
            if (row) {
              token.uid = String(row.id);
              token.role = row.role ?? 'USER';
              token.credits = row.credits ?? 0;
            }
          }
        } finally {
          client.release();
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.uid;
        (session.user as any).role = token.role ?? 'USER';
        (session.user as any).credits = token.credits ?? 0;
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