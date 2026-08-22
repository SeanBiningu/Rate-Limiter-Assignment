const express = require('express');
const path = require('path');
const { SlidingWindowRateLimiter } = require('./rateLimiter');

const app = express();
const port = process.env.PORT || 5000;
const limiter = new SlidingWindowRateLimiter({
  maxRequests: Number(process.env.RATE_LIMIT_MAX || 5),
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 10_000),
});

app.set('trust proxy', 1);
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.get('/api/test', (req, res) => {
  const key = req.get('x-api-key') || req.ip;
  if (!limiter.allow(key)) {
    return res.status(429).json({ message: 'Too many requests. Please try again later.' });
  }
  return res.json({ message: 'Request received successfully!' });
});

const clientBuild = path.join(__dirname, '..', 'build');
app.use(express.static(clientBuild));
app.use((req, res) => res.sendFile(path.join(clientBuild, 'index.html')));

app.listen(port, () => console.log(`Rate limiter server listening on port ${port}`));
