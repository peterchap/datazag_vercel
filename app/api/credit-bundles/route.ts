import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/drizzle';
import { creditBundles } from '@/shared/schema';

export async function GET(request: NextRequest) {
  try {
    const bundles = await db.select().from(creditBundles);
    return NextResponse.json(bundles);
  } catch (error) {
    console.error('Error fetching credit bundles:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
