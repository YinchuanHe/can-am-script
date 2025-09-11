const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');

const dev = process.env.NODE_ENV !== 'production';
const hostname = '0.0.0.0';
const port = process.env.PORT || 3000;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
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
    
    // Start the cron service for automation rotations (with delay to allow Redis to connect)
    if (!dev) {
      console.log('🕒 Waiting 5 seconds before starting cron service...');
      setTimeout(() => {
        console.log('🕒 Starting cron service...');
        // Dynamic import for production build
        import('./src/lib/cron-service.js').then(({ cronService }) => {
          cronService.start().catch(console.error);
        }).catch((err) => {
          // Fallback: cron service will be started when first automation starts
          console.log('Cron service will start with first automation:', err.message);
        });
      }, 5000);
    }
  });
});