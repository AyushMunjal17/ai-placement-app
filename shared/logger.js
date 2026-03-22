const util = require('util');

function normalizeMeta(meta) {
  if (!meta || typeof meta !== 'object' || Array.isArray(meta)) {
    return { value: meta };
  }

  const normalized = {};
  for (const [key, value] of Object.entries(meta)) {
    if (value instanceof Error) {
      normalized[key] = {
        message: value.message,
        stack: value.stack,
        name: value.name,
      };
      continue;
    }

    if (typeof value === 'bigint') {
      normalized[key] = value.toString();
      continue;
    }

    normalized[key] = value;
  }

  return normalized;
}

function writeLog(level, scope, message, meta = {}) {
  const payload = {
    timestamp: new Date().toISOString(),
    level,
    scope,
    message,
    ...normalizeMeta(meta),
  };

  const serialized = JSON.stringify(payload, (_, value) => {
    if (typeof value === 'undefined') {
      return null;
    }
    if (typeof value === 'function') {
      return util.inspect(value);
    }
    return value;
  });

  if (level === 'error' || level === 'warn') {
    console.error(serialized);
  } else {
    console.log(serialized);
  }
}

function createLogger(scope, baseMeta = {}) {
  const withMeta = (meta) => ({ ...baseMeta, ...(meta || {}) });

  return {
    child(extraMeta = {}) {
      return createLogger(scope, withMeta(extraMeta));
    },
    debug(message, meta) {
      writeLog('debug', scope, message, withMeta(meta));
    },
    info(message, meta) {
      writeLog('info', scope, message, withMeta(meta));
    },
    warn(message, meta) {
      writeLog('warn', scope, message, withMeta(meta));
    },
    error(message, meta) {
      writeLog('error', scope, message, withMeta(meta));
    },
  };
}

module.exports = { createLogger };
