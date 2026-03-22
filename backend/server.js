const express = require('express');
const http = require('http');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config({ path: './.env' });

const { createLogger } = require('../shared/logger');
const { config } = require('./lib/config');
const { connectDB } = require('./lib/db');
const { disconnectDB } = require('./lib/db');
const { ensureRedisReady, closeRedis } = require('./lib/redis');
const { requestContext } = require('./lib/requestContext');
const { httpMetricsMiddleware, metricsAuth, renderMetrics } = require('./lib/metrics');
const { initializeSocketServer } = require('./lib/socket');

const authRoutes = require('./routes/auth');
const problemRoutes = require('./routes/problems');
const submissionRoutes = require('./routes/submissions');
const adminRoutes = require('./routes/admin');
const aiRoutes = require('./routes/ai');
const resumeRoutes = require('./routes/resume');

const logger = createLogger('backend.server');
const app = express();

app.set('trust proxy', 1);
const corsOptions = config.frontendUrl === '*' ? { origin: true, credentials: false } : { origin: config.frontendUrl, credentials: true };
app.use(cors(corsOptions));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(requestContext);
app.use(httpMetricsMiddleware);

if (config.isServerless) {
  app.use(async (req, res, next) => {
    try {
      await connectDB();
      next();
    } catch (error) {
      next(error);
    }
  });
}

app.get('/api/health', (req, res) => {
  res.json({
    service: 'api-service',
    status: 'ok',
    environment: config.nodeEnv,
    timestamp: new Date().toISOString(),
    serverless: config.isServerless,
  });
});

app.get('/api/metrics', metricsAuth, async (req, res, next) => {
  try {
    res.type('text/plain').send(await renderMetrics());
  } catch (error) {
    next(error);
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/problems', problemRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/resume', resumeRoutes);

app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

app.use((error, req, res, next) => {
  logger.error('Unhandled backend error', { error, traceId: req.traceId });
  res.status(500).json({
    message: 'Internal server error',
    traceId: req.traceId,
  });
});

async function start() {
  await connectDB();
  await ensureRedisReady();
  const server = http.createServer(app);
  await initializeSocketServer(server);
  server.listen(config.port, () => {
    logger.info('API service listening', { port: config.port });
  });

  const shutdown = async (signal) => {
    logger.info('API shutting down', { signal });
    await new Promise((resolve) => server.close(resolve));
    await disconnectDB();
    await closeRedis();
    process.exit(0);
  };

  process.once('SIGINT', () => shutdown('SIGINT'));
  process.once('SIGTERM', () => shutdown('SIGTERM'));
}

if (!config.isServerless) {
  start().catch((error) => {
    logger.error('API startup failed', { error });
    process.exit(1);
  });
}

module.exports = app;
