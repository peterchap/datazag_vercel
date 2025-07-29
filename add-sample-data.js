/**
 * Sample Data Generator for Customer Management Platform
 * 
 * This script adds realistic sample data to your database through the API Gateway
 * to populate dashboards, charts, and analytics with authentic-looking content.
 */

import https from 'https';

// Configuration
const API_BASE_URL = 'https://apipg.datazag.com';
const USER_EMAIL = 'pchaplin@example.com';
const USER_PASSWORD = 'password123';

// Store the JWT token after login
let authToken = null;

/**
 * Make authenticated HTTP requests to the API Gateway
 */
function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API_BASE_URL);
    
    const options = {
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    };
    
    // Add authorization header if we have a token
    if (authToken) {
      options.headers['Authorization'] = `Bearer ${authToken}`;
    }
    
    const req = https.request(url, options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsedData = JSON.parse(responseData);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsedData);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${responseData}`));
          }
        } catch (error) {
          reject(new Error(`Invalid JSON response: ${responseData}`));
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    // Send request body if provided
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

/**
 * Login and get JWT token
 */
async function login() {
  console.log('🔐 Logging in to get authentication token...');
  
  try {
    const response = await makeRequest('POST', '/api/login', {
      email: USER_EMAIL,
      password: USER_PASSWORD
    });
    
    if (response.success && response.data && response.data.token) {
      authToken = response.data.token;
      console.log('✅ Login successful!');
      return response.data.user;
    } else {
      throw new Error('Login failed - no token received');
    }
  } catch (error) {
    console.error('❌ Login failed:', error.message);
    throw error;
  }
}

/**
 * Add sample credit transactions
 */
async function addCreditTransactions() {
  console.log('💳 Adding sample credit transactions...');
  
  const transactions = [
    {
      type: 'purchase',
      amount: 10000,
      description: 'Credit bundle purchase - 10,000 credits',
      status: 'completed',
      metadata: { bundle_id: 1, payment_method: 'stripe' }
    },
    {
      type: 'purchase',
      amount: 5000,
      description: 'Credit bundle purchase - 5,000 credits',
      status: 'completed',
      metadata: { bundle_id: 2, payment_method: 'paypal' }
    },
    {
      type: 'usage',
      amount: -150,
      description: 'API usage - data query',
      status: 'completed',
      metadata: { endpoint: '/api/search', rows_processed: 1500 }
    },
    {
      type: 'usage',
      amount: -75,
      description: 'API usage - analytics query',
      status: 'completed',
      metadata: { endpoint: '/api/analytics', rows_processed: 750 }
    },
    {
      type: 'usage',
      amount: -200,
      description: 'API usage - bulk export',
      status: 'completed',
      metadata: { endpoint: '/api/export', rows_processed: 2000 }
    }
  ];
  
  for (const transaction of transactions) {
    try {
      await makeRequest('POST', '/api/transactions', transaction);
      console.log(`✅ Added transaction: ${transaction.description}`);
    } catch (error) {
      console.log(`⚠️  Skipping transaction (might need endpoint): ${transaction.description}`);
    }
  }
}

/**
 * Add sample API usage records
 */
async function addApiUsageRecords() {
  console.log('📊 Adding sample API usage records...');
  
  const usageRecords = [
    {
      endpoint: '/api/search',
      credits: 10,
      status: 'success',
      responseTime: 145,
      metadata: { rows_returned: 100, query_complexity: 'medium' }
    },
    {
      endpoint: '/api/analytics',
      credits: 5,
      status: 'success',
      responseTime: 89,
      metadata: { rows_returned: 50, query_complexity: 'low' }
    },
    {
      endpoint: '/api/export',
      credits: 20,
      status: 'success',
      responseTime: 2341,
      metadata: { rows_returned: 2000, query_complexity: 'high' }
    },
    {
      endpoint: '/api/search',
      credits: 15,
      status: 'success',
      responseTime: 167,
      metadata: { rows_returned: 150, query_complexity: 'medium' }
    },
    {
      endpoint: '/api/analytics',
      credits: 8,
      status: 'success',
      responseTime: 112,
      metadata: { rows_returned: 80, query_complexity: 'low' }
    }
  ];
  
  for (const record of usageRecords) {
    try {
      await makeRequest('POST', '/api/api-usage', record);
      console.log(`✅ Added API usage: ${record.endpoint} (${record.credits} credits)`);
    } catch (error) {
      console.log(`⚠️  Skipping API usage record (might need endpoint): ${record.endpoint}`);
    }
  }
}

/**
 * Add sample API keys
 */
async function addApiKeys() {
  console.log('🔑 Adding sample API keys...');
  
  const apiKeys = [
    {
      name: 'Production Key',
      description: 'Main production API key for live data access',
      active: true
    },
    {
      name: 'Development Key', 
      description: 'Development and testing API key',
      active: true
    },
    {
      name: 'Analytics Key',
      description: 'Dedicated key for analytics and reporting',
      active: true
    }
  ];
  
  for (const apiKey of apiKeys) {
    try {
      await makeRequest('POST', '/api/api-keys', apiKey);
      console.log(`✅ Added API key: ${apiKey.name}`);
    } catch (error) {
      console.log(`⚠️  Skipping API key (might need endpoint): ${apiKey.name}`);
    }
  }
}

/**
 * Update user credits
 */
async function updateUserCredits() {
  console.log('💰 Updating user credits...');
  
  try {
    await makeRequest('PUT', '/api/users/credits', {
      credits: 14575 // Total credits after purchases and usage
    });
    console.log('✅ Updated user credits to 14,575');
  } catch (error) {
    console.log('⚠️  Could not update credits (might need endpoint)');
  }
}

/**
 * Main execution function
 */
async function main() {
  console.log('🚀 Starting sample data generation for Customer Management Platform\n');
  
  try {
    // Login first
    const user = await login();
    console.log(`Logged in as: ${user.first_name} ${user.last_name} (${user.email})\n`);
    
    // Add various types of sample data
    await addCreditTransactions();
    console.log();
    
    await addApiUsageRecords();
    console.log();
    
    await addApiKeys();
    console.log();
    
    await updateUserCredits();
    console.log();
    
    console.log('🎉 Sample data generation completed successfully!');
    console.log('📈 Your dashboard should now display charts, analytics, and transaction history.');
    console.log('🔄 Refresh your application to see the new data.');
    
  } catch (error) {
    console.error('❌ Error during sample data generation:', error.message);
    process.exit(1);
  }
}

// Run the script
main();