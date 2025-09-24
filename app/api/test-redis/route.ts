// Add this to your portal for testing: app/api/test-redis/route.ts
import { NextResponse } from 'next/server';
import { redisSyncService } from '@/lib/redis-sync-client';

export async function GET() {
  try {

        const result = await redisSyncService.registerApiKey({
          key: 'test_key_12345',
          user_id: 'test_user_67890',
          credits: 1000,
          active: true,
        });
        
        return NextResponse.json({ success: true, result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: message });
  }
}