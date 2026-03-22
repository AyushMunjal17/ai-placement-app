const Redis = require('ioredis');
const { config } = require('./config');
const { createLogger } = require('../../shared/logger');

const logger = createLogger('backend.redis');
const tls = config.redisUrl.startsWith('rediss://') ? {} : undefined;
const bullConnection = { url: config.redisUrl };

let redisClient = null;

function createClient(role) {
  const client = new Redis(config.redisUrl, {
    tls,
    maxRetriesPerRequest: null,
    lazyConnect: false,
    enableReadyCheck: true,
    enableAutoPipelining: true,
    keepAlive: 1,
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

function createRedisSubscriber() {
  return createClient('subscriber');
}

async function ensureRedisReady() {
  const client = getRedisClient();
  try {
    await client.ping();
  } catch (error) {
    logger.error('Redis ping failed', { error });
    throw error;
  }
}

async function closeRedis() {
  if (!redisClient) {
    return;
  }
  try {
    await redisClient.quit();
  } catch (error) {
    try {
      redisClient.disconnect();
    } catch {
      // ignore
    }
  } finally {
    redisClient = null;
  }
}

module.exports = {
  bullConnection,
  createRedisSubscriber,
  getRedisClient,
  ensureRedisReady,
  closeRedis,
};
