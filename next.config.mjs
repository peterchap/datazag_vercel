/** @type {import('next').NextConfig} */

console.log(`[Next.js Build] Using DATABASE_URL: ${process.env.DATABASE_URL}`);

const nextConfig = {
  // Add a webpack configuration to handle the pg-native module issue.
  webpack: (config, { isServer }) => {
    // The pg-native module is an optional dependency of the pg package.
    // It's not necessary for the application to run and can cause
    // build errors in a Webpack environment like Next.js.
    // By adding it to externals, we're telling Next.js to ignore it.
    if (!isServer) {
        config.externals.push({
            'pg-native': 'pg-native',
        });
    }

    return config;
  },
};

export default nextConfig;