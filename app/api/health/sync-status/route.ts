// app/api/health/sync-status/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { redisSyncService } from '@/lib/redis-sync-client';

const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request: NextRequest) {
  // Verify authorization
  const authHeader = request.headers.get('authorization');
  if (!authHeader || authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Check Redis sync service health
    const syncStatus = await redisSyncService.checkSyncStatus();
    
    // Get recent sync metrics (you could store these in a cache or DB)
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    return NextResponse.json({
      sync_service: syncStatus.success ? 'healthy' : 'unhealthy',
      last_check: now.toISOString(),
      redis_api: {
        reachable: syncStatus.success,
        response_time_ms: syncStatus.statusCode === 200 ? 'ok' : 'slow'
      },
      recommendations: {
        should_sync: true,
        suggested_date: yesterday.toISOString().slice(0, 10).replace(/-/g, '')
      }
    });
    
  } catch (error) {
    return NextResponse.json({
      sync_service: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
      last_check: new Date().toISOString()
    }, { status: 500 });
  }
}