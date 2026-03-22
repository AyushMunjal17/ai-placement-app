const { config } = require('../lib/config');
const { getRedisClient } = require('../lib/redis');

function resultKey(jobId) {
  return `result:${jobId}`;
}

async function storeJobResult(jobId, userId, payload) {
  const client = getRedisClient();
  if (client.status !== 'ready') {
    throw new Error('Redis not ready');
  }

  const data = { userId: String(userId), payload };
  await client.set(resultKey(jobId), JSON.stringify(data), 'EX', config.resultTtlSec);
}

async function getStoredJobResult(jobId) {
  const client = getRedisClient();
  if (client.status !== 'ready') {
    throw new Error('Redis not ready');
  }

  const raw = await client.get(resultKey(jobId));
  return raw ? JSON.parse(raw) : null;
}

module.exports = {
  getStoredJobResult,
  storeJobResult,
};
