import Redis from 'ioredis';

export interface RedisConnectionStatus {
  connected: boolean;
  error?: string;
  host?: string;
  port?: number;
  responseTime?: number;
}

export async function checkRedisConnection(timeout: number = 5000): Promise<RedisConnectionStatus> {
  const startTime = Date.now();
  let redis: Redis | null = null;

  try {
    const redisUrl = process.env.REDIS_URL || process.env.REDIS_PRIVATE_URL || 'redis://localhost:6379';
    
    redis = new Redis(redisUrl, {
      connectTimeout: timeout,
      lazyConnect: true,
      maxRetriesPerRequest: 1,
    });

    await redis.connect();
    
    await redis.ping();
    
    const responseTime = Date.now() - startTime;
    
    const connectionInfo = redis.options;
    
    return {
      connected: true,
      host: connectionInfo.host,
      port: connectionInfo.port,
      responseTime
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    return {
      connected: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      responseTime
    };
  } finally {
    if (redis) {
      try {
        await redis.disconnect();
      } catch (disconnectError) {
        console.warn('Error disconnecting from Redis during check:', disconnectError);
      }
    }
  }
}