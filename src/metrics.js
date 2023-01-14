const express = require('express');
const Prometheus = require('prom-client');

class Metrics {
  constructor() {
    const labelNames = ['method', 'uri', 'code'];
    this.httpRequestsTotalCounter = new Prometheus.Counter({
      labelNames,
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
    });
    this.httpRequestSizeBytesSummary = new Prometheus.Summary({
      labelNames,
      name: 'http_request_size_bytes',
      help: 'Duration of HTTP requests size in bytes',
    });
    this.httpResponseSizeBytesSummary = new Prometheus.Summary({
      labelNames,
      name: 'http_response_size_bytes',
      help: 'Duration of HTTP response size in bytes',
    });
    this.httpServerRequestsSecondsHistogram = new Prometheus.Histogram({
      labelNames,
      name: 'http_server_requests_seconds',
      help: 'Duration of HTTP requests in seconds',
      buckets: Prometheus.exponentialBuckets(0.05, 1.3, 20),
    });
  }

  addHttpMetric(req, res, startEpoch) {
    const responseTimeInMs = Date.now();

    const httpRequestMethod = req.method;
    const httpRequestPath = req.path;
    const httpResponseStatus = res.statusCode;

    // TotalCount
    this.httpRequestsTotalCounter
      .labels(httpRequestMethod, httpRequestPath, httpResponseStatus)
      .inc();

    // Request Bytes
    if (req.headers['content-length']) {
      this.httpRequestSizeBytesSummary
        .labels(httpRequestMethod, httpRequestPath, httpResponseStatus)
        .observe(req.headers['content-length']);
    }

    // Response Bytes
    if (res.getHeader('content-length')) {
      this.httpResponseSizeBytesSummary
        .labels(httpRequestMethod, httpRequestPath, httpResponseStatus)
        .observe(res.getHeader('content-length'));
    }

    // Response Time
    this.httpServerRequestsSecondsHistogram
      .labels(httpRequestMethod, httpRequestPath, httpResponseStatus)
      .observe((responseTimeInMs - startEpoch) / 1000);
  }

  addMetricsRouter() {
    this.metricsApp.get('/metrics', (req, res) => {
      res.set('Content-Type', Prometheus.register.contentType);
      res.end(Prometheus.register.metrics());
    });
  }

  addHealthRouter() {
    this.metricsApp.get('/health', (req, res) => {
      res.end({status: 'UP'});
    });
  }

  static startMetriccs(app, metricPort) {
    const instance = new Metrics();
    instance.metricsApp = express();

    Prometheus.collectDefaultMetrics();
    app.use((req, res, next) => {
      const startEpoch = Date.now();
      next();
      instance.addHttpMetric(req, res, startEpoch);
    });

    instance.addMetricsRouter();
    instance.addHealthRouter();

    instance.metricsApp.listen(metricPort, () => {
      console.log(`Metric-Server running on port ${metricPort}`);
    });
  }
}

module.exports = Metrics;
