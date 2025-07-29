import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

// Export environment variables
export default process.env;