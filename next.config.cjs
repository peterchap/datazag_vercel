/** @type {import('next').NextConfig} */
// Base URL of the API Gateway for dev/prod. Default to 3000 (gateway) while Next dev runs on 3001.
const GATEWAY_URL = process.env.NEXT_PUBLIC_API_GATEWAY_URL || 'http://localhost:3000';

const nextConfig = {
  serverExternalPackages: ['pg', 'drizzle-orm'],
  env: {
    DATABASE_URL: process.env.DATABASE_URL,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    MICROSOFT_CLIENT_ID: process.env.MICROSOFT_CLIENT_ID,
    MICROSOFT_CLIENT_SECRET: process.env.MICROSOFT_CLIENT_SECRET,
    GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID,
    GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET,
    LINKEDIN_CLIENT_ID: process.env.LINKEDIN_CLIENT_ID,
    LINKEDIN_CLIENT_SECRET: process.env.LINKEDIN_CLIENT_SECRET,
    SENDGRID_API_KEY: process.env.SENDGRID_API_KEY,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_PUBLISHABLE_KEY: process.env.STRIPE_PUBLISHABLE_KEY,
    PAYPAL_CLIENT_ID: process.env.PAYPAL_CLIENT_ID,
    PAYPAL_CLIENT_SECRET: process.env.PAYPAL_CLIENT_SECRET,
  },
  images: { domains: ['localhost'] },
  output: 'standalone',
  async redirects() {
    return [
      { source: '/signup', destination: '/register', permanent: false },
      { source: '/sign-up', destination: '/register', permanent: false },
    ];
  },
  // Proxy API routes to the API Gateway to avoid CORS in the browser.
  // Exclude internal Next API routes that must be handled locally, like NextAuth.
  async rewrites() {
    return [
    // Keep PayPal API helper local (used by client wrapper to create orders)
    { source: '/api/paypal/:path*', destination: '/api/paypal/:path*' },
      {
  // Anything under /api/* except /api/auth/* (NextAuth) and /api/claim-free-bundle stays local.
  // Also keep /api/api-keys local to avoid CORS and use session cookies directly
  source: '/api/:path((?!auth|claim-free-bundle|api-keys|paypal).*)',
        destination: `${GATEWAY_URL}/api/:path`,
      },
    ];
  },
};

module.exports = nextConfig;
