import { NextResponse } from 'next/server';
import { Storage } from '@/lib/storage';

export async function GET() {
  const timestamp = new Date().toISOString();
  let redisStatus;

  try {
    redisStatus = await Storage.testRedisConnection();
  } catch (error) {
    redisStatus = {
      connected: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }

  const healthData = {
    status: redisStatus.connected ? 'healthy' : 'degraded',
    timestamp,
    service: 'court-automation',
    version: '1.0.0',
    redis: {
      connected: redisStatus.connected,
      ...(redisStatus.connected && {
        host: redisStatus.host,
        port: redisStatus.port,
        responseTime: redisStatus.responseTime
      }),
      ...(redisStatus.error && { error: redisStatus.error })
    }
  };

  return NextResponse.json(healthData);
}