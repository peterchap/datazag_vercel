#!/usr/bin/env node

import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('Starting optimized build process...');

try {
  // Set memory limit and build with optimizations
  process.env.NODE_OPTIONS = '--max-old-space-size=2048';
  
  console.log('Building frontend...');
  execSync('npx vite build --mode production --minify esbuild', {
    stdio: 'inherit',
    cwd: __dirname,
    timeout: 300000, // 5 minutes timeout
  });
  
  console.log('Building backend...');
  execSync('npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist --minify --target=node18', {
    stdio: 'inherit',
    cwd: __dirname,
    timeout: 60000, // 1 minute timeout
  });
  
  console.log('Build completed successfully!');
} catch (error) {
  console.error('Build failed:', error.message);
  process.exit(1);
}