const { MetricsRegistry } = require('../../shared/metrics');

const registry = new MetricsRegistry('compiler_executor_');
const httpRequestsTotal = registry.counter('http_requests_total', 'HTTP requests handled by the executor', ['method', 'route', 'status']);
const httpRequestDuration = registry.histogram('http_request_duration_seconds', 'Executor HTTP request duration in seconds', ['method', 'route', 'status']);
const sandboxJobsTotal = registry.counter('sandbox_jobs_total', 'Sandbox jobs by operation and outcome', ['operation', 'language', 'status']);
const activeExecutionsGauge = registry.gauge('active_executions', 'Active sandbox executions on this instance', ['machine']);
const queuedExecutionsGauge = registry.gauge('queued_executions', 'Queued sandbox requests on this instance', ['machine']);
const cacheArtifactsGauge = registry.gauge('cache_artifacts', 'Artifacts currently stored in shared cache', ['machine']);
const processMemoryBytes = registry.gauge('process_memory_bytes', 'Executor process memory by segment', ['segment']);

function routeLabel(req) {
  if (req.route?.path) {
    return req.route.path;
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

function renderMetrics() {
  const memory = process.memoryUsage();
  processMemoryBytes.set({ segment: 'rss' }, memory.rss);
  processMemoryBytes.set({ segment: 'heap_used' }, memory.heapUsed);
  processMemoryBytes.set({ segment: 'heap_total' }, memory.heapTotal);
  processMemoryBytes.set({ segment: 'external' }, memory.external);
  return registry.render();
}

module.exports = {
  activeExecutionsGauge,
  cacheArtifactsGauge,
  httpMetricsMiddleware,
  queuedExecutionsGauge,
  renderMetrics,
  sandboxJobsTotal,
};
