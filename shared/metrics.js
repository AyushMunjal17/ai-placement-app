function formatLabels(labels = {}) {
  const entries = Object.entries(labels).filter(([, value]) => value !== undefined && value !== null);
  if (!entries.length) {
    return '';
  }

  return `{${entries
    .map(([key, value]) => `${key}="${String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`)
    .join(',')}}`;
}

function labelKey(labelNames, labels = {}) {
  return labelNames.map((name) => `${name}:${labels[name] ?? ''}`).join('|');
}

function labelValues(labelNames, labels = {}) {
  const result = {};
  for (const name of labelNames) {
    result[name] = labels[name] ?? '';
  }
  return result;
}

class CounterMetric {
  constructor(name, help, labelNames = []) {
    this.name = name;
    this.help = help;
    this.type = 'counter';
    this.labelNames = labelNames;
    this.values = new Map();
  }

  inc(labels = {}, value = 1) {
    const key = labelKey(this.labelNames, labels);
    const current = this.values.get(key) || { labels: labelValues(this.labelNames, labels), value: 0 };
    current.value += value;
    this.values.set(key, current);
  }

  lines() {
    return Array.from(this.values.values()).map((entry) => `${this.name}${formatLabels(entry.labels)} ${entry.value}`);
  }
}

class GaugeMetric {
  constructor(name, help, labelNames = []) {
    this.name = name;
    this.help = help;
    this.type = 'gauge';
    this.labelNames = labelNames;
    this.values = new Map();
  }

  set(labels = {}, value) {
    const key = labelKey(this.labelNames, labels);
    this.values.set(key, { labels: labelValues(this.labelNames, labels), value });
  }

  inc(labels = {}, value = 1) {
    const key = labelKey(this.labelNames, labels);
    const current = this.values.get(key) || { labels: labelValues(this.labelNames, labels), value: 0 };
    current.value += value;
    this.values.set(key, current);
  }

  dec(labels = {}, value = 1) {
    this.inc(labels, value * -1);
  }

  lines() {
    return Array.from(this.values.values()).map((entry) => `${this.name}${formatLabels(entry.labels)} ${entry.value}`);
  }
}

class HistogramMetric {
  constructor(name, help, labelNames = [], buckets = [0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10, 30, 60]) {
    this.name = name;
    this.help = help;
    this.type = 'histogram';
    this.labelNames = labelNames;
    this.buckets = [...buckets].sort((a, b) => a - b);
    this.values = new Map();
  }

  observe(labels = {}, value) {
    const key = labelKey(this.labelNames, labels);
    if (!this.values.has(key)) {
      this.values.set(key, {
        labels: labelValues(this.labelNames, labels),
        count: 0,
        sum: 0,
        buckets: this.buckets.map((bucket) => ({ bucket, count: 0 })),
      });
    }

    const entry = this.values.get(key);
    entry.count += 1;
    entry.sum += value;
    for (const bucket of entry.buckets) {
      if (value <= bucket.bucket) {
        bucket.count += 1;
      }
    }
  }

  lines() {
    const output = [];
    for (const entry of this.values.values()) {
      for (const bucket of entry.buckets) {
        output.push(`${this.name}_bucket${formatLabels({ ...entry.labels, le: bucket.bucket })} ${bucket.count}`);
      }
      output.push(`${this.name}_bucket${formatLabels({ ...entry.labels, le: '+Inf' })} ${entry.count}`);
      output.push(`${this.name}_sum${formatLabels(entry.labels)} ${entry.sum}`);
      output.push(`${this.name}_count${formatLabels(entry.labels)} ${entry.count}`);
    }
    return output;
  }
}

class MetricsRegistry {
  constructor(prefix = '') {
    this.prefix = prefix;
    this.metrics = [];
  }

  counter(name, help, labelNames = []) {
    const metric = new CounterMetric(`${this.prefix}${name}`, help, labelNames);
    this.metrics.push(metric);
    return metric;
  }

  gauge(name, help, labelNames = []) {
    const metric = new GaugeMetric(`${this.prefix}${name}`, help, labelNames);
    this.metrics.push(metric);
    return metric;
  }

  histogram(name, help, labelNames = [], buckets) {
    const metric = new HistogramMetric(`${this.prefix}${name}`, help, labelNames, buckets);
    this.metrics.push(metric);
    return metric;
  }

  render() {
    const lines = [];
    for (const metric of this.metrics) {
      lines.push(`# HELP ${metric.name} ${metric.help}`);
      lines.push(`# TYPE ${metric.name} ${metric.type}`);
      lines.push(...metric.lines());
    }
    return `${lines.join('\n')}\n`;
  }
}

module.exports = { MetricsRegistry };
