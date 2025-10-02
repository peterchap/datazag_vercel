// middleware.ts
import NextAuth from 'next-auth';
import { authConfig } from './lib/auth.config';

export default NextAuth(authConfig).auth;

export const config = {
  matcher: [
    '/((?!api/stripe/webhook|api|_next/static|_next/image|favicon.ico|.*\\.(png|jpg|jpeg|svg)).*)',
  ],
};