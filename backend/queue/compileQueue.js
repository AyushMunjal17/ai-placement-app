const { Queue } = require('bullmq');
const { bullConnection } = require('../lib/redis');
const { config } = require('../config');

const compileQueue = new Queue('compile-queue', {
  connection: bullConnection,
  defaultJobOptions: {
    attempts: 1,
    removeOnComplete: { count: config.queueCompletedRetention },
    removeOnFail: { count: config.queueFailedRetention },
  },
});

module.exports = { compileQueue };
