const dotenv = require('dotenv');

dotenv.config({ path: './.env' });

const { createLogger } = require('../shared/logger');
const { startWorkerService } = require('./worker/index');

const logger = createLogger('backend.worker-entry');

async function start() {
  await startWorkerService();
}

start().catch((error) => {
  logger.error('Worker service failed to start', { error });
  process.exit(1);
});
