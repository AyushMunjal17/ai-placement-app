const { config } = require('./config');
const { getRedisClient } = require('./redis');
const { activeExecutionsGauge, queuedExecutionsGauge } = require('./metrics');

const redisKey = `executor:capacity:${config.machineId}`;
const waitQueue = [];
let draining = false;
let localActive = 0;

const acquireScript = `
local current = tonumber(redis.call('GET', KEYS[1]) or '0')
local limit = tonumber(ARGV[1])
local ttl = tonumber(ARGV[2])
if current >= limit then
  return 0
end
current = redis.call('INCR', KEYS[1])
redis.call('PEXPIRE', KEYS[1], ttl)
return current
`;

const releaseScript = `
local current = tonumber(redis.call('GET', KEYS[1]) or '0')
if current <= 1 then
  redis.call('DEL', KEYS[1])
  return 0
end
current = redis.call('DECR', KEYS[1])
redis.call('PEXPIRE', KEYS[1], tonumber(ARGV[1]))
return current
`;

async function ensureClient() {
  const client = getRedisClient();
  if (client.status !== 'ready') {
    await client.connect();
  }
  return client;
}

async function tryAcquireSlot() {
  const client = await ensureClient();
  const result = await client.eval(acquireScript, 1, redisKey, config.maxConcurrentExecutions, config.semaphoreLeaseMs);
  return Number(result) > 0;
}

async function releaseSlot() {
  const client = await ensureClient();
  localActive = Math.max(0, localActive - 1);
  activeExecutionsGauge.set({ machine: config.machineId }, localActive);
  await client.eval(releaseScript, 1, redisKey, config.semaphoreLeaseMs);
  setImmediate(drainWaitQueue);
}

async function drainWaitQueue() {
  if (draining) {
    return;
  }

  draining = true;
  try {
    while (waitQueue.length) {
      const entry = waitQueue[0];
      if (entry.timedOut) {
        waitQueue.shift();
        continue;
      }

      const acquired = await tryAcquireSlot();
      if (!acquired) {
        break;
      }

      waitQueue.shift();
      clearTimeout(entry.timer);
      localActive += 1;
      activeExecutionsGauge.set({ machine: config.machineId }, localActive);
      queuedExecutionsGauge.set({ machine: config.machineId }, waitQueue.length);
      entry.resolve(async () => {
        await releaseSlot();
      });
    }
  } finally {
    queuedExecutionsGauge.set({ machine: config.machineId }, waitQueue.length);
    draining = false;
  }
}

function acquireExecutionSlot() {
  return new Promise((resolve, reject) => {
    const entry = {
      timedOut: false,
      resolve,
      reject,
      timer: setTimeout(() => {
        entry.timedOut = true;
        const index = waitQueue.indexOf(entry);
        if (index >= 0) {
          waitQueue.splice(index, 1);
        }
        queuedExecutionsGauge.set({ machine: config.machineId }, waitQueue.length);
        reject(new Error('QUEUE_TIMEOUT'));
      }, config.queueTimeoutMs),
    };

    waitQueue.push(entry);
    queuedExecutionsGauge.set({ machine: config.machineId }, waitQueue.length);
    void drainWaitQueue();
  });
}

function getCapacityState() {
  return {
    active: localActive,
    queued: waitQueue.filter((entry) => !entry.timedOut).length,
    maxConcurrent: config.maxConcurrentExecutions,
  };
}

module.exports = {
  acquireExecutionSlot,
  getCapacityState,
};
