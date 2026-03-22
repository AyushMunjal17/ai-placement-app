const crypto = require('crypto');
const { config } = require('./config');

function safeEquals(left, right) {
  const leftBuffer = Buffer.from(left || '');
  const rightBuffer = Buffer.from(right || '');
  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }
  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function requireServiceAuth(req, res, next) {
  if (!config.serviceToken && config.nodeEnv !== 'production') {
    return next();
  }

  const token = req.headers['x-executor-token'] || (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!safeEquals(token, config.serviceToken)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  return next();
}

function requireMetricsAuth(req, res, next) {
  if (!config.metricsToken) {
    return requireServiceAuth(req, res, next);
  }

  const token = req.headers['x-metrics-token'] || (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!safeEquals(token, config.metricsToken)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  return next();
}

module.exports = {
  requireMetricsAuth,
  requireServiceAuth,
};
