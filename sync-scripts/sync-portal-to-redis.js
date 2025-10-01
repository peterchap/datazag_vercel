import postgres from 'postgres';
import fetch from 'node-fetch';
import { createWriteStream } from 'fs';
import { mkdir } from 'fs/promises';

// Configuration
const config = {
  redisApiUrl: process.env.REDIS_API_URL,
  redisApiKey: process.env.REDIS_API_KEY,
  neonDbUrl: process.env.NEON_DB_URL,
  batchSize: 100,
  maxRetries: 3
};

// Initialize Postgres connection
const sql = postgres(config.neonDbUrl, {
  ssl: 'require',
  max: 1,
  idle_timeout: 20,
  connect_timeout: 10
});

// Logger setup
await mkdir('logs', { recursive: true });
const logStream = createWriteStream(`logs/sync-${new Date().toISOString()}.log`, { flags: 'a' });

function log(message, level = 'INFO') {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${level}] ${message}\n`;
  console.log(logMessage.trim());
  logStream.write(logMessage);
}

// Retry utility
async function withRetry(fn, retries = config.maxRetries) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === retries - 1) throw error;
      log(`Attempt ${i + 1} failed, retrying... Error: ${error.message}`, 'WARN');
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
}

// Fetch data from Neon Postgres
async function fetchCustomerData() {
  log('Fetching customer data from Neon DB...');
  
  try {
    // Get all active API keys with customer info and credits
    const apiKeys = await sql`
      SELECT 
        ak.api_key,
        ak.is_active,
        c.customer_id,
        c.email,
        c.credits_balance,
        c.rate_limit,
        ak.created_at,
        ak.last_used_at
      FROM api_keys ak
      JOIN customers c ON ak.customer_id = c.customer_id
      WHERE ak.is_active = true AND c.is_active = true
    `;
    
    log(`Fetched ${apiKeys.length} active API keys`);
    return apiKeys;
    
  } catch (error) {
    log(`Error fetching customer data: ${error.message}`, 'ERROR');
    throw error;
  }
}

// Fetch usage statistics to pull back from Redis
async function fetchUsageStats() {
  log('Fetching usage statistics from Redis API...');
  
  try {
    const response = await fetch(`${config.redisApiUrl}/internal/usage/export`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${config.redisApiKey}`,
        'Content-Type': 'application/json',
        'X-Internal-Request': 'true'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Redis API returned ${response.status}: ${await response.text()}`);
    }
    
    const data = await response.json();
    log(`Fetched usage data for ${data.usage_records?.length || 0} API keys`);
    return data.usage_records || [];
    
  } catch (error) {
    log(`Error fetching usage stats: ${error.message}`, 'ERROR');
    return []; // Non-critical, continue with sync
  }
}

// Update Neon DB with usage from Redis
async function updateUsageInDB(usageRecords) {
  if (!usageRecords.length) {
    log('No usage records to update');
    return;
  }
  
  log(`Updating ${usageRecords.length} usage records in Neon DB...`);
  
  try {
    await sql.begin(async sql => {
      for (const record of usageRecords) {
        // Update customer credits
        await sql`
          UPDATE customers c
          SET 
            credits_balance = credits_balance - ${record.credits_used},
            updated_at = NOW()
          FROM api_keys ak
          WHERE ak.api_key = ${record.api_key}
            AND ak.customer_id = c.customer_id
            AND c.credits_balance >= ${record.credits_used}
        `;
        
        // Insert usage log
        await sql`
          INSERT INTO usage_logs (
            api_key,
            credits_used,
            request_timestamp,
            synced_at
          ) VALUES (
            ${record.api_key},
            ${record.credits_used},
            ${record.timestamp},
            NOW()
          )
          ON CONFLICT (api_key, request_timestamp) DO NOTHING
        `;
      }
    });
    
    log('Successfully updated usage in DB', 'SUCCESS');
    
  } catch (error) {
    log(`Error updating usage in DB: ${error.message}`, 'ERROR');
    throw error;
  }
}

// Sync data to Redis Memorystore via Redis API
async function syncToRedis(customerData) {
  log(`Syncing ${customerData.length} records to Redis...`);
  
  const batches = [];
  for (let i = 0; i < customerData.length; i += config.batchSize) {
    batches.push(customerData.slice(i, i + config.batchSize));
  }
  
  let successCount = 0;
  let failCount = 0;
  
  for (let i = 0; i < batches.length; i++) {
    log(`Processing batch ${i + 1}/${batches.length}...`);
    
    try {
      await withRetry(async () => {
        const response = await fetch(`${config.redisApiUrl}/internal/sync/batch`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${config.redisApiKey}`,
            'Content-Type': 'application/json',
            'X-Internal-Request': 'true'
          },
          body: JSON.stringify({
            records: batches[i].map(record => ({
              api_key: record.api_key,
              customer_id: record.customer_id,
              credits_balance: record.credits_balance,
              rate_limit: record.rate_limit,
              is_active: record.is_active,
              email: record.email
            })),
            sync_timestamp: new Date().toISOString()
          })
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Redis API returned ${response.status}: ${errorText}`);
        }
        
        const result = await response.json();
        successCount += result.success_count || batches[i].length;
      });
      
    } catch (error) {
      log(`Batch ${i + 1} failed: ${error.message}`, 'ERROR');
      failCount += batches[i].length;
    }
  }
  
  log(`Sync complete: ${successCount} succeeded, ${failCount} failed`, 'SUCCESS');
  return { successCount, failCount };
}

// Main sync process
async function main() {
  const startTime = Date.now();
  log('=== Starting Portal to Redis Sync ===');
  
  try {
    // Step 1: Fetch usage from Redis and update Neon DB
    const usageRecords = await fetchUsageStats();
    if (usageRecords.length > 0) {
      await updateUsageInDB(usageRecords);
    }
    
    // Step 2: Fetch current data from Neon DB
    const customerData = await fetchCustomerData();
    
    if (customerData.length === 0) {
      log('No active customers to sync', 'WARN');
      return;
    }
    
    // Step 3: Sync to Redis
    const result = await syncToRedis(customerData);
    
    // Step 4: Report results
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    log(`=== Sync completed in ${duration}s ===`, 'SUCCESS');
    log(`Total records: ${customerData.length}`);
    log(`Successful: ${result.successCount}`);
    log(`Failed: ${result.failCount}`);
    
    if (result.failCount > 0) {
      process.exit(1); // Exit with error code for GitHub Actions to detect
    }
    
  } catch (error) {
    log(`Sync failed with error: ${error.message}`, 'ERROR');
    log(error.stack, 'ERROR');
    process.exit(1);
    
  } finally {
    await sql.end();
    logStream.end();
  }
}

// Run the sync
main().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});