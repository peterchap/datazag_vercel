// app/api/health/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/lib/drizzle';
import { users } from '@/shared/schema';

export async function GET() {
  try {
    // Test database connection
    const dbTest = await db.select().from(users).limit(1);
    
    // Test Redis connection
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    const redisTest = await fetch(`${process.env.REDIS_API_URL}/redis/sync-status`, {
      headers: {
        'X-Internal-Token': process.env.INTERNAL_API_TOKEN!
      },
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    
    const redisHealthy = redisTest.ok;
    
    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: dbTest ? 'ok' : 'error',
        redis: redisHealthy ? 'ok' : 'error'
      },
      version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || 'unknown'
    });
    
  } catch (error) {
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}