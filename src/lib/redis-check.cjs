const Redis = require('ioredis');

async function checkRedisConnection(timeout = 5000) {
  const startTime = Date.now();
  let redis = null;

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

module.exports = { checkRedisConnection };