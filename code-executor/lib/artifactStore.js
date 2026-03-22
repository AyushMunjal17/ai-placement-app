const crypto = require('crypto');
const { config } = require('./config');
const { getRedisClient } = require('./redis');

function sourceHash(language, code) {
  return crypto.createHash('sha256').update(`${language}\0${code}`).digest('hex');
}

function metaKey(artifactId) {
  return `artifact:meta:${artifactId}`;
}

function dataKey(artifactId) {
  return `artifact:data:${artifactId}`;
}

async function ensureClient() {
  const client = getRedisClient();
  if (client.status !== 'ready') {
    await client.connect();
  }
  return client;
}

async function getArtifact(artifactId) {
  const client = await ensureClient();
  const [metaRaw, data] = await Promise.all([
    client.get(metaKey(artifactId)),
    client.getBuffer(dataKey(artifactId)),
  ]);

  if (!metaRaw || !data) {
    return null;
  }

  return {
    artifactId,
    meta: JSON.parse(metaRaw),
    data,
  };
}

async function storeArtifact({ artifactId, meta, data }) {
  const client = await ensureClient();
  await client
    .multi()
    .set(metaKey(artifactId), JSON.stringify(meta), 'EX', config.artifactTtlSec)
    .set(dataKey(artifactId), data, 'EX', config.artifactTtlSec)
    .exec();
}

async function scanArtifactKeys() {
  const client = await ensureClient();
  let cursor = '0';
  const keys = [];
  do {
    const [nextCursor, batch] = await client.scan(cursor, 'MATCH', 'artifact:*', 'COUNT', 200);
    cursor = nextCursor;
    keys.push(...batch);
  } while (cursor !== '0');
  return keys;
}

async function clearArtifacts() {
  const client = await ensureClient();
  const keys = await scanArtifactKeys();
  if (keys.length) {
    await client.del(keys);
  }
  return keys.length;
}

async function countArtifacts() {
  const keys = await scanArtifactKeys();
  return keys.filter((key) => key.startsWith('artifact:meta:')).length;
}

module.exports = {
  clearArtifacts,
  countArtifacts,
  getArtifact,
  sourceHash,
  storeArtifact,
};
