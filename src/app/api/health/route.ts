import { NextResponse } from 'next/server';

export async function GET() {
  // Simple health check that doesn't require Redis
  return NextResponse.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'court-automation',
    version: '1.0.0'
  });
}