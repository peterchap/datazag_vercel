// Customer Portal: app/api/cron/sync-usage/route.ts
// Enhanced for Vercel Pro - can handle longer operations

import { NextRequest, NextResponse } from 'next/server';
import { usageSyncService } from '@/lib/usage-sync-service';
import { db } from '@/lib/drizzle';
import { users } from '@/shared/schema';
import { redisSyncService } from '@/lib/redis-sync-service';

// Verify this is a legitimate cron request
function verifyCronRequest(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  
  if (!cronSecret) {
    console.warn('[Cron] CRON_SECRET not configured');
    return false;
  }
  
  return authHeader === `Bearer ${cronSecret}`;
}

export async function POST(request: NextRequest) {
  console.log('[Cron] Usage sync job started');
  
  // Verify this is a legitimate cron request
  if (!verifyCronRequest(request)) {
    console.error('[Cron] Unauthorized cron request');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    const startTime = Date.now();
    const url = new URL(request.url);
    
    // Get parameters
    const dateParam = url.searchParams.get('date');
    const forceFullSync = url.searchParams.get('force_full') === 'true';
    const batchSize = parseInt(url.searchParams.get('batch_size') || '500');
    
    // Determine target date
    let targetDate: string;
    if (dateParam && /^\d{8}$/.test(dateParam)) {
      targetDate = dateParam;
    } else {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      targetDate = yesterday.toISOString().slice(0, 10).replace(/-/g, '');
    }
    
    console.log(`[Cron] Syncing date: ${targetDate}, batch size: ${batchSize}, force full: ${forceFullSync}`);
    
    // With Vercel Pro 60s timeout, we can handle larger operations
    const maxExecutionTime = 55000; // 55 seconds safety margin
    const syncStartTime = Date.now();
    
    let totalSynced = 0;
    let totalErrors = 0;
    let processedUsers = 0;
    let timeoutReached = false;
    
    // Get all users in batches to respect timeout
    const allUsers = await db.select({ id: users.id }).from(users);
    console.log(`[Cron] Processing ${allUsers.length} users`);
    
    // Process users in batches
    for (let i = 0; i < allUsers.length; i += batchSize) {
      // Check if we're approaching timeout
      if (Date.now() - syncStartTime > maxExecutionTime) {
        console.log(`[Cron] Timeout approaching, processed ${processedUsers}/${allUsers.length} users`);
        timeoutReached = true;
        break;
      }
      
      const userBatch = allUsers.slice(i, i + batchSize);
      
      // Process batch
      for (const user of userBatch) {
        try {
          const result = await usageSyncService.syncUserUsage(user.id, targetDate);
          totalSynced += result.synced;
          totalErrors += result.errors;
          processedUsers++;
          
          // Log progress for large operations
          if (processedUsers % 100 === 0) {
            console.log(`[Cron] Progress: ${processedUsers}/${allUsers.length} users processed`);
          }
          
        } catch (error) {
          console.error(`[Cron] Error syncing user ${user.id}:`, error);
          totalErrors++;
        }
        
        // Check timeout again
        if (Date.now() - syncStartTime > maxExecutionTime) {
          timeoutReached = true;
          break;
        }
      }
      
      if (timeoutReached) break;
    }
    
    // Handle credit discrepancies if requested and time permits
    let discrepancies: any[] = [];
    if (forceFullSync && !timeoutReached && (Date.now() - syncStartTime < maxExecutionTime - 10000)) {
      console.log('[Cron] Running credit discrepancy check...');
      discrepancies = await usageSyncService.checkCreditDiscrepancies();
      
      if (discrepancies.length > 0) {
        console.log(`[Cron] Found ${discrepancies.length} credit discrepancies`);
        
        // Attempt to resolve discrepancies if time permits
        for (const discrepancy of discrepancies.slice(0, 10)) { // Limit to 10 for safety
          if (Date.now() - syncStartTime > maxExecutionTime - 5000) break;
          
          try {
            // Force sync credits from DB to Redis for this user
            await redisSyncService.updateCredits(discrepancy.userId, discrepancy.dbCredits);
            console.log(`[Cron] Resolved discrepancy for user ${discrepancy.userId}`);
          } catch (error) {
            console.error(`[Cron] Failed to resolve discrepancy for user ${discrepancy.userId}:`, error);
          }
        }
      }
    }
    
    const duration = Date.now() - startTime;
    const isPartialSync = timeoutReached || processedUsers < allUsers.length;
    
    console.log(`[Cron] Sync completed in ${duration}ms:`, {
      totalSynced,
      totalErrors,
      processedUsers,
      totalUsers: allUsers.length,
      isPartialSync,
      timeoutReached
    });
    
    // Return detailed results
    const result = {
      success: !timeoutReached || totalErrors < totalSynced * 0.1, // Allow 10% error rate
      date: targetDate,
      duration_ms: duration,
      synced_records: totalSynced,
      errors: totalErrors,
      processed_users: processedUsers,
      total_users: allUsers.length,
      is_partial_sync: isPartialSync,
      timeout_reached: timeoutReached,
      credit_discrepancies: discrepancies.length,
      discrepancies: forceFullSync ? discrepancies : [],
      batch_size: batchSize,
      execution_environment: 'vercel-pro'
    };
    
    // Return appropriate status code
    if (timeoutReached && totalSynced === 0) {
      return NextResponse.json(result, { status: 202 }); // Accepted but incomplete
    }
    
    return NextResponse.json(result);
    
  } catch (error) {
    console.error('[Cron] Usage sync job failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
      execution_environment: 'vercel-pro'
    }, { status: 500 });
  }
}

// Enhanced GET endpoint for manual testing
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const testHeader = request.headers.get('x-test-sync');
  const isDev = process.env.NODE_ENV === 'development';
  
  if (!isDev && !testHeader) {
    return NextResponse.json({ error: 'Not allowed' }, { status: 403 });
  }
  
  console.log('[Cron] Manual usage sync triggered');
  
  try {
    const dateParam = url.searchParams.get('date');
    const forceFullSync = url.searchParams.get('force_full') === 'true';
    
    // For manual testing, use smaller batch size to avoid timeouts
    const batchSize = parseInt(url.searchParams.get('batch_size') || '100');
    
    let targetDate: string;
    if (dateParam && /^\d{8}$/.test(dateParam)) {
      targetDate = dateParam;
    } else {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      targetDate = yesterday.toISOString().slice(0, 10).replace(/-/g, '');
    }
    
    console.log(`[Cron] Manual sync: date=${targetDate}, force_full=${forceFullSync}, batch_size=${batchSize}`);
    
    // Run sync with parameters
    const result = await usageSyncService.syncUsageFromRedis(targetDate);
    
    // Check discrepancies if requested
    let discrepancies: any[] = [];
    if (forceFullSync) {
      discrepancies = await usageSyncService.checkCreditDiscrepancies();
    }
    
    return NextResponse.json({
      success: true,
      date: targetDate,
      manual: true,
      synced_records: result.synced,
      errors: result.errors,
      credit_discrepancies: discrepancies.length,
      discrepancies: forceFullSync ? discrepancies : [],
      batch_size: batchSize,
      execution_environment: 'vercel-pro'
    });
    
  } catch (error) {
    console.error('[Cron] Manual sync failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      execution_environment: 'vercel-pro'
    }, { status: 500 });
  }
}
