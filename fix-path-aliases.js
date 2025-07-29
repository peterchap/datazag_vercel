/**
 * This script helps fix path alias resolution issues on local systems
 * Run with: node fix-path-aliases.js
 */

const fs = require('fs');
const path = require('path');

// Function to check if file exists and log its status
function checkFileExists(filepath) {
  try {
    if (fs.existsSync(filepath)) {
      console.log(`✓ Found: ${filepath}`);
      return true;
    } else {
      console.error(`✗ Missing: ${filepath}`);
      return false;
    }
  } catch (err) {
    console.error(`Error checking ${filepath}:`, err.message);
    return false;
  }
}

// Check the critical files that might be causing path resolution issues
console.log('Checking critical files for path resolution...');

// Check recover-account.tsx
const recoverAccountPath = path.resolve(__dirname, 'client/src/pages/recover-account.tsx');
checkFileExists(recoverAccountPath);

// Check admin-requests.tsx
const adminRequestsPath = path.resolve(__dirname, 'client/src/pages/admin/admin-requests.tsx');
checkFileExists(adminRequestsPath);

// Check tsconfig.json for proper path alias configuration
const tsconfigPath = path.resolve(__dirname, 'tsconfig.json');
if (checkFileExists(tsconfigPath)) {
  try {
    const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf8'));
    if (tsconfig.compilerOptions && tsconfig.compilerOptions.paths) {
      console.log('✓ tsconfig.json has path aliases configured:');
      console.log(JSON.stringify(tsconfig.compilerOptions.paths, null, 2));
    } else {
      console.error('✗ tsconfig.json missing path aliases configuration');
    }
  } catch (err) {
    console.error('Error parsing tsconfig.json:', err.message);
  }
}

// Check vite.config.ts for proper alias configuration
const viteConfigPath = path.resolve(__dirname, 'vite.config.ts');
if (checkFileExists(viteConfigPath)) {
  try {
    const viteConfig = fs.readFileSync(viteConfigPath, 'utf8');
    if (viteConfig.includes('alias') && viteConfig.includes('@')) {
      console.log('✓ vite.config.ts has alias configuration');
    } else {
      console.error('✗ vite.config.ts might be missing proper alias configuration');
    }
  } catch (err) {
    console.error('Error reading vite.config.ts:', err.message);
  }
}

console.log('\nPotential solutions for path alias issues:');
console.log('1. Use relative imports (e.g., "./pages/recover-account" instead of "@/pages/recover-account")');
console.log('2. Make sure file names match exactly in case (recover-account.tsx vs RecoverAccount.tsx)');
console.log('3. Clear Vite cache: rm -rf node_modules/.vite');
console.log('4. Restart your development server');

// Create a .env-debug file with paths for debugging
const envDebugContent = `
# Local development path debugging
# These variables can help debug path resolution issues
CLIENT_SRC_PATH=${path.resolve(__dirname, 'client/src')}
SHARED_PATH=${path.resolve(__dirname, 'shared')}
NODE_PATH=${process.env.NODE_PATH || ''}
`;

fs.writeFileSync('.env-debug', envDebugContent);
console.log('\nCreated .env-debug file with path debugging information');

// Instructions for local server
console.log('\nFor your local server, try updating your package.json scripts:');
console.log('  "dev": "NODE_ENV=development NODE_PATH=. tsx server/index.ts"');
console.log('This adds the current directory to NODE_PATH, which can help resolve module paths.');