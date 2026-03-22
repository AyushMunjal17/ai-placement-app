const { MetricsRegistry } = require('../../shared/metrics');
const { config } = require('./config');

const registry = new MetricsRegistry('compiler_backend_');

const httpRequestsTotal = registry.counter('http_requests_total', 'HTTP requests handled by the backend', ['method', 'route', 'status']);
const httpRequestDuration = registry.histogram('http_request_duration_seconds', 'HTTP request duration in seconds', ['method', 'route', 'status']);
const submissionJobsTotal = registry.counter('submission_jobs_total', 'Submission jobs by stage and outcome', ['stage', 'status']);
const executorCallsTotal = registry.counter('executor_calls_total', 'Executor client calls', ['operation', 'status']);
const workerActiveJobs = registry.gauge('worker_active_jobs', 'Active BullMQ jobs by queue', ['queue']);
const queueJobs = registry.gauge('queue_jobs', 'BullMQ job counts by queue and state', ['queue', 'state']);
const processMemoryBytes = registry.gauge('process_memory_bytes', 'Backend process memory by segment', ['segment']);

function routeLabel(req) {
  if (req.baseUrl && req.route && req.route.path) {
    return `${req.baseUrl}${req.route.path}`;
  }
  return req.originalUrl.split('?')[0] || req.path || 'unmatched';
}

function httpMetricsMiddleware(req, res, next) {
  const startedAt = process.hrtime.bigint();
  res.on('finish', () => {
    const durationSeconds = Number(process.hrtime.bigint() - startedAt) / 1e9;
    const labels = {
      method: req.method,
      route: routeLabel(req),
      status: String(res.statusCode),
    };

    httpRequestsTotal.inc(labels);
    httpRequestDuration.observe(labels, durationSeconds);
  });
  next();
}

function metricsAuth(req, res, next) {
  if (!config.metricsToken) {
    return next();
  }

  const headerToken = req.headers['x-metrics-token'] || (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (headerToken !== config.metricsToken) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  return next();
}

async function refreshQueueMetrics() {
  const { compileQueue } = require('../queues/compileQueue');
  const { executionQueue } = require('../queues/executionQueue');
  const queuePairs = [
    ['compile', compileQueue],
    ['execution', executionQueue],
  ];

  for (const [name, queue] of queuePairs) {
    const counts = await queue.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed', 'prioritized');
    for (const [state, value] of Object.entries(counts)) {
      queueJobs.set({ queue: name, state }, value);
    }
  }
}

async function renderMetrics() {
  await refreshQueueMetrics();
  const memoryUsage = process.memoryUsage();
  processMemoryBytes.set({ segment: 'rss' }, memoryUsage.rss);
  processMemoryBytes.set({ segment: 'heap_used' }, memoryUsage.heapUsed);
  processMemoryBytes.set({ segment: 'heap_total' }, memoryUsage.heapTotal);
  processMemoryBytes.set({ segment: 'external' }, memoryUsage.external);
  return registry.render();
}

module.exports = {
  executorCallsTotal,
  httpMetricsMiddleware,
  metricsAuth,
  renderMetrics,
  submissionJobsTotal,
  workerActiveJobs,
};
