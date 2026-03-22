const { createTraceId } = require('../../shared/trace');
const { createLogger } = require('../../shared/logger');

const logger = createLogger('backend.http');

function requestContext(req, res, next) {
  const traceId = req.headers['x-trace-id'] || createTraceId();
  req.traceId = traceId;
  req.startedAtNs = process.hrtime.bigint();
  req.log = logger.child({ traceId, method: req.method, path: req.originalUrl });
  res.setHeader('x-trace-id', traceId);
  next();
}

module.exports = { requestContext };
