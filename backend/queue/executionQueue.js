const { Queue, QueueEvents } = require('bullmq');
const { bullConnection } = require('../lib/redis');
const { config } = require('../config');

const executionQueue = new Queue('execution-queue', {
  connection: bullConnection,
  defaultJobOptions: {
    attempts: 1,
    removeOnComplete: { count: config.queueCompletedRetention },
    removeOnFail: { count: config.queueFailedRetention },
  },
});

const executionQueueEvents = new QueueEvents('execution-queue', {
  connection: bullConnection,
});

module.exports = { executionQueue, executionQueueEvents };
