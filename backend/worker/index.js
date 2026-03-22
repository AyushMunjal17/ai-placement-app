const { createLogger } = require('../../shared/logger');
const { connectDB, disconnectDB } = require('../lib/db');
const { ensureRedisReady, closeRedis } = require('../lib/redis');
const { startSubmissionWorkers, stopSubmissionWorkers } = require('./submissionWorker');

const logger = createLogger('backend.worker-entry');

async function startWorkerService() {
  await connectDB();
  await ensureRedisReady();
  await startSubmissionWorkers();
  logger.info('Worker service started');

  const shutdown = async (signal) => {
    logger.info('Worker shutting down', { signal });
    await stopSubmissionWorkers();
    await disconnectDB();
    await closeRedis();
    process.exit(0);
  };

  process.once('SIGINT', () => shutdown('SIGINT'));
  process.once('SIGTERM', () => shutdown('SIGTERM'));
}

module.exports = { startWorkerService };
