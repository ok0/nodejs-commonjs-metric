const express = require('express');
const Metrics = require('./metrics');

const app = express();
const port = process.env.PORT || 3000;
const metricPort = process.env.METRICS_PORT || 9090;

app.get('/hello', (req, res, next) => {
  res.json({message: 'Hello World!'});
  next();
});

app.get('/world', (req, res, next) => {
  res.json({message: 'World Hello!'});
  next();
});

const server = app.listen(port, () => {
  console.log(`Appication running on port ${port}`);
});

if (metricPort) {
  Metrics.startMetriccs(app, metricPort);
}

// Graceful shutdown
process.on('SIGTERM', () => {
  clearInterval(metricsInterval);

  server.close(err => {
    if (err) {
      console.error(err);
      process.exit(1);
    }

    process.exit(0);
  });
});
