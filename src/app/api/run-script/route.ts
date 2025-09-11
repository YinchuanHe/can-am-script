import { NextResponse } from 'next/server';

// This is a deprecated endpoint - use /api/start-automation instead
export async function POST() {
  return NextResponse.json(
    { 
      error: 'This endpoint is deprecated. Use /api/start-automation instead.',
      deprecated: true
    },
    { status: 410 }
  );
}