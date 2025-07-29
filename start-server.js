/**
 * This script loads environment variables from .env file
 * before starting the Node.js application
 */

const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');
const { spawn } = require('child_process');

// Attempt to load .env file from multiple possible locations
const possiblePaths = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), '../.env'),
  path.resolve(__dirname, '../.env')
];

let loaded = false;

for (const envPath of possiblePaths) {
  if (fs.existsSync(envPath)) {
    console.log(`Loading environment variables from: ${envPath}`);
    const result = dotenv.config({ path: envPath });
    
    if (result.error) {
      console.error(`Error loading .env file from ${envPath}:`, result.error);
    } else {
      console.log(`Successfully loaded environment variables from ${envPath}`);
      loaded = true;
      break;
    }
  }
}

if (!loaded) {
  console.warn('No .env file found in any of the expected locations. Using system environment variables only.');
}

// Check if a critical environment variable exists
if (!process.env.DATABASE_URL) {
  console.error('ERROR: DATABASE_URL environment variable is not set. Application may not function correctly.');
} else {
  console.log('DATABASE_URL is properly set in the environment.');
}

// Start the server with the environment variables loaded
process.env.NODE_ENV = process.env.NODE_ENV || 'development';
console.log(`Starting server in ${process.env.NODE_ENV} mode...`);

// Start the actual npm run dev command
const npmProcess = spawn('npm', ['run', 'dev'], { 
  stdio: 'inherit',
  env: process.env
});

// Handle process exit
npmProcess.on('exit', (code) => {
  console.log(`Server process exited with code ${code}`);
  process.exit(code);
});

// Forward signals to the child process
['SIGINT', 'SIGTERM'].forEach(signal => {
  process.on(signal, () => {
    npmProcess.kill(signal);
  });
});