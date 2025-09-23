// app/api/test-usage/route.ts
import { NextResponse } from 'next/server';
import { redisSyncService } from '@/lib/redis-sync-client';

export async function GET() {
  try {
    const result = await redisSyncService.recordApiUsage({
      api_key: 'test_key_12345', // Use the key you just created
      endpoint: '/api/test',
      credits_used: 50,
      status: 'success'
    });
    
    return NextResponse.json({ success: true, result });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message });
  }
}