const os = require('os');
const path = require('path');

function envNumber(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw === null || raw === '') {
    return fallback;
  }

  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

const config = {
  port: envNumber('PORT', 8080),
  nodeEnv: process.env.NODE_ENV || 'development',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  serviceToken: process.env.EXECUTOR_SERVICE_TOKEN || process.env.CODE_EXECUTOR_TOKEN || '',
  metricsToken: process.env.METRICS_TOKEN || '',
  runnerImage: process.env.SANDBOX_RUNNER_IMAGE || 'code-executor:latest',
  machineId: process.env.MACHINE_ID || os.hostname(),
  maxConcurrentExecutions: envNumber('MAX_CONCURRENT_EXECUTIONS', Math.max(2, os.cpus().length * 2)),
  queueTimeoutMs: envNumber('QUEUE_TIMEOUT_MS', 15000),
  semaphoreLeaseMs: envNumber('SEMAPHORE_LEASE_MS', 30000),
  artifactTtlSec: envNumber('ARTIFACT_TTL_SEC', 900),
  defaultTimeLimitMs: envNumber('DEFAULT_TIME_LIMIT_MS', 2000),
  compileTimeoutMs: envNumber('COMPILE_TIMEOUT_MS', 15000),
  defaultMemoryLimitMb: envNumber('DEFAULT_MEMORY_LIMIT_MB', 256),
  maxMemoryLimitMb: envNumber('MAX_MEMORY_LIMIT_MB', 512),
  pidsLimit: envNumber('SANDBOX_PIDS_LIMIT', 64),
  batchCaseConcurrency: envNumber('BATCH_CASE_CONCURRENCY', 2),
  maxStdoutBytes: envNumber('MAX_STDOUT_BYTES', 200000),
  maxStderrBytes: envNumber('MAX_STDERR_BYTES', 50000),
  artifactTmpDir: process.env.ARTIFACT_TMP_DIR || path.join(require('os').tmpdir(), 'code-executor-artifacts'),
};

module.exports = { config, envNumber };
