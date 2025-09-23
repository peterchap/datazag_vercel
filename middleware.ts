// middleware.ts
import NextAuth from 'next-auth';
import { authConfig } from './lib/auth.config'; // 👈 Updated to relative path

export default NextAuth(authConfig).auth;

export const config = {
  // Match all routes except for static files, images, and API routes
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};