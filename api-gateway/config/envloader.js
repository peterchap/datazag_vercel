const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// This self-invoking function ensures that environment variables are loaded
// as soon as this module is required in your main index.js file.
(() => {
  const cwd = process.cwd();

  // Define potential locations for the .env file, prioritizing .env.local
  const locations = [
    path.resolve(cwd, '.env.local'),
    path.resolve(cwd, '.env'),
    path.resolve(cwd, '..', '.env.local'),
    path.resolve(cwd, '..', '.env')
  ];

  let loadedPath = null;
  for (const location of locations) {
    if (fs.existsSync(location)) {
      dotenv.config({ path: location });
      loadedPath = location;
      break;
    }
  }

  if (loadedPath) {
    console.log(`[EnvLoader] Loaded environment variables from: ${loadedPath}`);
  } else {
    // Fallback if no specific file is found
    dotenv.config();
    console.log('[EnvLoader] No specific .env file found. Using default environment.');
  }

  // Provide development-friendly fallbacks for key secrets
  if (!process.env.JWT_SECRET && process.env.NEXTAUTH_SECRET) {
    process.env.JWT_SECRET = process.env.NEXTAUTH_SECRET;
  }
  if (!process.env.API_SERVICE_KEY && process.env.INTERNAL_API_TOKEN) {
    process.env.API_SERVICE_KEY = process.env.INTERNAL_API_TOKEN;
  }
})();