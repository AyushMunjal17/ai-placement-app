const axios = require('axios');
const { config } = require('./config');
const { createLogger } = require('../../shared/logger');
const { executorCallsTotal } = require('./metrics');

const logger = createLogger('backend.executor-client');

class ExecutorError extends Error {
  constructor(message, { statusCode = 500, retryable = false, details = null } = {}) {
    super(message);
    this.name = 'ExecutorError';
    this.statusCode = statusCode;
    this.retryable = retryable;
    this.details = details;
  }
}

function clientHeaders(traceId) {
  const headers = { 'x-trace-id': traceId };
  if (config.executorServiceToken) {
    headers['x-executor-token'] = config.executorServiceToken;
  }
  return headers;
}

async function post(path, body, { traceId, timeoutMs = config.executorTimeoutMs, operation }) {
  try {
    const response = await axios.post(`${config.codeExecutorUrl}${path}`, body, {
      timeout: timeoutMs,
      headers: clientHeaders(traceId),
    });
    executorCallsTotal.inc({ operation, status: 'ok' });
    return response.data;
  } catch (error) {
    executorCallsTotal.inc({ operation, status: 'error' });
    const statusCode = error.response?.status || 502;
    const message = error.response?.data?.error || error.message || 'Executor request failed';
    const retryable = statusCode >= 500 || error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT';
    logger.error('Executor request failed', { operation, traceId, statusCode, retryable, error });
    throw new ExecutorError(message, {
      statusCode,
      retryable,
      details: error.response?.data || null,
    });
  }
}

function compileSubmission({ language, code, timeLimitMs, memoryLimitMb, traceId }) {
  return post('/compile', { language, code, timeLimitMs, memoryLimitMb }, { traceId, operation: 'compile' });
}

function runArtifactBatch({ artifactId, language, inputs, timeLimitMs, memoryLimitMb, traceId }) {
  return post('/run-batch', {
    artifactId,
    language,
    inputs,
    timeLimitMs,
    memoryLimitMb,
  }, {
    traceId,
    operation: 'run-batch',
    timeoutMs: Math.max(config.executorTimeoutMs, 30000 + inputs.length * Math.max(1000, timeLimitMs || 0)),
  });
}

function executeOnce({ language, code, stdin, timeLimitMs, memoryLimitMb, traceId }) {
  return post('/execute', {
    language,
    code,
    stdin,
    timeLimitMs,
    memoryLimitMb,
  }, {
    traceId,
    operation: 'execute',
  });
}

module.exports = {
  ExecutorError,
  compileSubmission,
  executeOnce,
  runArtifactBatch,
};
