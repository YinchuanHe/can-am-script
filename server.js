const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');

const dev = process.env.NODE_ENV !== 'production';
const hostname = '0.0.0.0';
const port = process.env.PORT || 3000;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(async () => {
  // Check Redis connection on startup
  try {
    console.log('🔍 Checking Redis connection...');
    const { checkRedisConnection } = require('./src/lib/redis-check.cjs');
    const redisStatus = await checkRedisConnection();
    
    if (redisStatus.connected) {
      console.log(`✅ Redis connected successfully (${redisStatus.host}:${redisStatus.port}) - ${redisStatus.responseTime}ms`);
    } else {
      console.warn(`⚠️ Redis connection failed: ${redisStatus.error} - ${redisStatus.responseTime}ms`);
      if (process.env.REQUIRE_REDIS === 'true') {
        console.error('💥 REQUIRE_REDIS is true, exiting...');
        process.exit(1);
      } else {
        console.log('📝 Server will continue without Redis (set REQUIRE_REDIS=true to exit on failure)');
      }
    }
  } catch (error) {
    console.error('❌ Error checking Redis connection:', error.message);
    if (process.env.REQUIRE_REDIS === 'true') {
      console.error('💥 REQUIRE_REDIS is true, exiting...');
      process.exit(1);
    }
  }

  createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('Internal server error');
    }
  })
  .listen(port, () => {
    console.log(`🚀 Ready on http://${hostname}:${port}`);
    
    // Note: Cron service will automatically start when the first automation is created
    if (!dev) {
      console.log('📋 Cron service will start with first automation');
    }
  });
});