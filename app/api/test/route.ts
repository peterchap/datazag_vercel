import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  return NextResponse.json({ 
    message: 'Next.js API is working!',
    timestamp: new Date().toISOString()
  })
}
