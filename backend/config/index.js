const os = require('os');

function envNumber(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw === null || raw === '') {
    return fallback;
  }

  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const cpuCores = os.cpus().length;
const defaultWorkerConcurrency = Math.max(2, cpuCores * 2);
const defaultCompileConcurrency = Math.max(1, Math.floor(defaultWorkerConcurrency / 2));
const defaultExecutionConcurrency = Math.max(1, defaultWorkerConcurrency - defaultCompileConcurrency);

const config = {
  port: envNumber('PORT', 5000),
  nodeEnv: process.env.NODE_ENV || 'development',
  frontendUrl: process.env.FRONTEND_URL || '*',
  mongoUri: process.env.MONGO_URI,
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  codeExecutorUrl: process.env.CODE_EXECUTOR_URL || 'http://localhost:8080',
  executorServiceToken: process.env.EXECUTOR_SERVICE_TOKEN || process.env.CODE_EXECUTOR_TOKEN || '',
  metricsToken: process.env.METRICS_TOKEN || '',
  submissionRateLimit: envNumber('SUBMISSION_RATE_LIMIT', 20),
  submissionRateWindowSec: envNumber('SUBMISSION_RATE_WINDOW_SEC', 60),
  runRateLimit: envNumber('RUN_RATE_LIMIT', 60),
  runRateWindowSec: envNumber('RUN_RATE_WINDOW_SEC', 60),
  executionChunkSize: envNumber('EXECUTION_CHUNK_SIZE', 4),
  workerConcurrency: envNumber('WORKER_CONCURRENCY', defaultWorkerConcurrency),
  compileQueueConcurrency: envNumber('COMPILE_QUEUE_CONCURRENCY', defaultCompileConcurrency),
  executionQueueConcurrency: envNumber('EXECUTION_QUEUE_CONCURRENCY', defaultExecutionConcurrency),
  resultTtlSec: envNumber('SUBMISSION_RESULT_TTL_SEC', 600),
  queueCompletedRetention: envNumber('QUEUE_COMPLETED_RETENTION', 1000),
  queueFailedRetention: envNumber('QUEUE_FAILED_RETENTION', 1000),
  executorTimeoutMs: envNumber('EXECUTOR_HTTP_TIMEOUT_MS', 120000),
  socketChannel: process.env.SUBMISSION_EVENTS_CHANNEL || 'submission-events',
  isServerless,
  enableRunEndpoint: process.env.ENABLE_RUN_ENDPOINT === 'true',
};

module.exports = { config, envNumber };
