const Redis = require('ioredis');
const { config } = require('./config');
const { createLogger } = require('../../shared/logger');

const logger = createLogger('executor.redis');
const tls = config.redisUrl.startsWith('rediss://') ? {} : undefined;
let redisClient = null;

function createClient(role) {
  const client = new Redis(config.redisUrl, {
    tls,
    maxRetriesPerRequest: null,
    lazyConnect: true,
    enableReadyCheck: true,
  });

  client.on('error', (error) => {
    logger.error('Redis client error', { role, error });
  });

  return client;
}

function getRedisClient() {
  if (!redisClient) {
    redisClient = createClient('primary');
  }
  return redisClient;
}

module.exports = { getRedisClient };
