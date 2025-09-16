const Redis = require('ioredis');

async function checkRedisConnection(timeout = 5000, maxRetries = 3) {
  const redisUrl = process.env.REDIS_URL || process.env.REDIS_PRIVATE_URL || 'redis://localhost:6379';
  
  // Log the URL being used (mask password for security)
  const maskedUrl = redisUrl.replace(/:([^:@]+)@/, ':****@');
  console.log(`🔗 Using Redis URL: ${maskedUrl}`);
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const startTime = Date.now();
    let redis = null;

    try {
      if (attempt > 1) {
        console.log(`🔄 Redis connection attempt ${attempt}/${maxRetries}...`);
      }
      
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
}

module.exports = { checkRedisConnection };