const crypto = require('crypto');

function createTraceId() {
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return crypto.randomBytes(16).toString('hex');
}

module.exports = { createTraceId };
