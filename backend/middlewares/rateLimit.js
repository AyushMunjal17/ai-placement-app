const { getRedisClient } = require('../lib/redis');
const { createLogger } = require('../../shared/logger');

const logger = createLogger('backend.rate-limit');

function createUserRateLimiter({ prefix, limit, windowSec }) {
  return async function rateLimiter(req, res, next) {
    const subject = req.user?._id?.toString() || req.ip;
    const bucket = Math.floor(Date.now() / (windowSec * 1000));
    const key = `rate:${prefix}:${subject}:${bucket}`;

    try {
      const client = getRedisClient();
      if (client.status !== 'ready') {
        throw new Error('Redis not ready');
      }

      const tx = client.multi();
      tx.incr(key);
      tx.expire(key, windowSec + 1);
      const result = await tx.exec();
      const count = result?.[0]?.[1] || 0;
      const remaining = Math.max(0, limit - count);

      res.setHeader('X-RateLimit-Limit', String(limit));
      res.setHeader('X-RateLimit-Remaining', String(remaining));
      res.setHeader('X-RateLimit-Window', String(windowSec));

      if (count > limit) {
        return res.status(429).json({
          message: 'Rate limit exceeded',
          error: 'RATE_LIMIT_EXCEEDED',
        });
      }

      return next();
    } catch (error) {
      logger.error('Rate limiter failed', { error, prefix, subject });
      return res.status(503).json({
        message: 'Rate limiter unavailable',
        error: 'RATE_LIMIT_UNAVAILABLE',
      });
    }
  };
}

module.exports = { createUserRateLimiter };
