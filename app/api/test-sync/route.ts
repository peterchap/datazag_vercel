// app/api/test-sync/route.ts  
import { NextResponse } from 'next/server';
import { usageSyncService } from '@/lib/usage-sync-service';

export async function GET() {
  try {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const result = await usageSyncService.syncUsageFromRedis(today);
    
    return NextResponse.json({ success: true, result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}