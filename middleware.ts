// middleware.ts
import NextAuth from 'next-auth';
import { authConfig } from './lib/auth.config';

export default NextAuth(authConfig).auth;

export const config = {
  matcher: [
    // Match all routes except the following (by not including them)
    '/((?!api/stripe/webhook|api/.*|_next/static/.*|_next/image/.*|favicon.ico|.*\\.(?:png|jpg|jpeg|svg)$).*)',
  ],
};