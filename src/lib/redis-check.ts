import Redis from 'ioredis';

export interface RedisConnectionStatus {
  connected: boolean;
  error?: string;
  host?: string;
  port?: number;
  responseTime?: number;
  attempt?: number;
}

export async function checkRedisConnection(timeout: number = 5000, maxRetries: number = 3): Promise<RedisConnectionStatus> {
  const redisUrl = process.env.REDIS_URL || process.env.REDIS_PRIVATE_URL || 'redis://localhost:6379';
  
  // Log the URL being used (mask password for security)
  const maskedUrl = redisUrl.replace(/:([^:@]+)@/, ':****@');
  console.log(`🔗 Using Redis URL: ${maskedUrl}`);
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const startTime = Date.now();
    let redis: Redis | null = null;

    try {
      if (attempt === 1 && redisUrl.includes('railway.internal')) {
        console.log('⏳ Waiting 3 seconds for Railway DNS to be ready...');
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
      
      if (attempt > 1) {
        console.log(`🔄 Redis connection attempt ${attempt}/${maxRetries}...`);
      }
      
      redis = new Redis(redisUrl, {
        connectTimeout: timeout,
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        family: 0  // Enable dual-stack (IPv4 + IPv6) DNS resolution for Railway
      });

      await redis.connect();
      
      await redis.ping();
      
      const responseTime = Date.now() - startTime;
      const connectionInfo = redis.options;
      
      return {
        connected: true,
        host: connectionInfo.host,
        port: connectionInfo.port,
        responseTime,
        attempt
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      if (redis) {
        try {
          await redis.disconnect();
        } catch (disconnectError) {
          console.warn('Error disconnecting from Redis during check:', disconnectError);
        }
      }
      
      if (attempt === maxRetries) {
        return {
          connected: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          responseTime,
          attempt
        };
      }
      
      // Wait before retry: 1s, 2s, 4s
      const delay = Math.pow(2, attempt - 1) * 1000;
      console.log(`⏳ Redis connection failed (attempt ${attempt}/${maxRetries}), retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  // This should never be reached due to the maxRetries check above
  return {
    connected: false,
    error: 'Maximum retries exceeded',
    responseTime: 0,
    attempt: maxRetries
  };
}