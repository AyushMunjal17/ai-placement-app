const express = require('express');
const fs = require('fs');
const dotenv = require('dotenv');

dotenv.config();

const { createLogger } = require('../shared/logger');
const { createTraceId } = require('../shared/trace');
const { config } = require('./lib/config');
const { clearArtifacts } = require('./lib/artifactStore');
const { requireMetricsAuth, requireServiceAuth } = require('./lib/serviceAuth');
const { httpMetricsMiddleware, renderMetrics, cacheArtifactsGauge } = require('./lib/metrics');
const { getCapacityState } = require('./lib/semaphore');
const { cacheStats, compileInSandbox, executeOnce, runStoredArtifactBatch } = require('./lib/dockerSandbox');

const logger = createLogger('executor.server');
const app = express();
app.use(express.json({ limit: '1mb' }));
app.use(httpMetricsMiddleware);
fs.mkdirSync(config.artifactTmpDir, { recursive: true });

app.use((req, res, next) => {
  req.traceId = req.headers['x-trace-id'] || createTraceId();
  res.setHeader('x-trace-id', req.traceId);
  next();
});

function executorErrorStatus(error) {
  return error.message === 'QUEUE_TIMEOUT' ? 503 : 500;
}

app.get('/', async (req, res) => {
  const capacity = getCapacityState();
  const cache = await cacheStats();
  cacheArtifactsGauge.set({ machine: config.machineId }, cache.artifacts);
  res.json({
    service: 'sandbox-service',
    status: 'ok',
    machineId: config.machineId,
    capacity,
    cache,
  });
});

app.get('/metrics', requireMetricsAuth, async (req, res) => {
  const cache = await cacheStats();
  cacheArtifactsGauge.set({ machine: config.machineId }, cache.artifacts);
  res.type('text/plain').send(renderMetrics());
});

app.get('/stats', requireServiceAuth, async (req, res) => {
  const capacity = getCapacityState();
  const cache = await cacheStats();
  cacheArtifactsGauge.set({ machine: config.machineId }, cache.artifacts);
  res.json({
    machineId: config.machineId,
    capacity,
    cache,
    uptimeSeconds: Math.round(process.uptime()),
  });
});

app.get('/cache/stats', requireServiceAuth, async (req, res) => {
  const cache = await cacheStats();
  cacheArtifactsGauge.set({ machine: config.machineId }, cache.artifacts);
  res.json(cache);
});

app.delete('/cache', requireServiceAuth, async (req, res) => {
  const cleared = await clearArtifacts();
  cacheArtifactsGauge.set({ machine: config.machineId }, 0);
  res.json({ cleared });
});

app.post('/compile', requireServiceAuth, async (req, res) => {
  try {
    const { language, code, timeLimitMs, memoryLimitMb } = req.body;
    if (!language || !code) {
      return res.status(400).json({ error: 'language and code are required' });
    }

    const result = await compileInSandbox({
      language,
      code,
      timeLimitMs,
      memoryLimitMb,
      traceId: req.traceId,
    });

    return res.json(result);
  } catch (error) {
    logger.error('Compile endpoint failed', { error, traceId: req.traceId });
    return res.status(executorErrorStatus(error)).json({ error: error.message });
  }
});

app.post('/run-batch', requireServiceAuth, async (req, res) => {
  try {
    const { artifactId, inputs, timeLimitMs, memoryLimitMb } = req.body;
    if (!artifactId || !Array.isArray(inputs)) {
      return res.status(400).json({ error: 'artifactId and inputs[] are required' });
    }

    const results = await runStoredArtifactBatch({
      artifactId,
      inputs,
      timeLimitMs,
      memoryLimitMb,
      traceId: req.traceId,
    });

    return res.json(results);
  } catch (error) {
    logger.error('Run-batch endpoint failed', { error, traceId: req.traceId });
    return res.status(executorErrorStatus(error)).json({ error: error.message });
  }
});

app.post('/execute', requireServiceAuth, async (req, res) => {
  try {
    const { language, code, stdin = '', timeLimitMs, memoryLimitMb } = req.body;
    if (!language || !code) {
      return res.status(400).json({ error: 'language and code are required' });
    }

    const result = await executeOnce({
      language,
      code,
      stdin,
      timeLimitMs,
      memoryLimitMb,
      traceId: req.traceId,
    });

    return res.json(result);
  } catch (error) {
    logger.error('Execute endpoint failed', { error, traceId: req.traceId });
    return res.status(executorErrorStatus(error)).json({ error: error.message });
  }
});

app.post('/batch', requireServiceAuth, async (req, res) => {
  try {
    const { language, code, inputs, timeLimitMs, memoryLimitMb } = req.body;
    if (!language || !code || !Array.isArray(inputs)) {
      return res.status(400).json({ error: 'language, code, and inputs[] are required' });
    }

    const compile = await compileInSandbox({
      language,
      code,
      timeLimitMs,
      memoryLimitMb,
      traceId: req.traceId,
    });

    if (compile.compile_output) {
      return res.json({
        results: inputs.map(() => ({
          stdout: '',
          stderr: compile.compile_output,
          compile_output: compile.compile_output,
          exitCode: 1,
          durationMs: null,
          memoryUsedMb: null,
        })),
      });
    }

    const results = await runStoredArtifactBatch({
      artifactId: compile.artifactId,
      inputs,
      timeLimitMs,
      memoryLimitMb,
      traceId: req.traceId,
    });

    return res.json(results);
  } catch (error) {
    logger.error('Batch endpoint failed', { error, traceId: req.traceId });
    return res.status(executorErrorStatus(error)).json({ error: error.message });
  }
});

app.use((error, req, res, next) => {
  logger.error('Unhandled executor error', { error, traceId: req.traceId });
  res.status(500).json({ error: 'Internal execution error', traceId: req.traceId });
});

app.listen(config.port, () => {
  logger.info('Sandbox service listening', {
    port: config.port,
    machineId: config.machineId,
    runnerImage: config.runnerImage,
    maxConcurrentExecutions: config.maxConcurrentExecutions,
  });
});
