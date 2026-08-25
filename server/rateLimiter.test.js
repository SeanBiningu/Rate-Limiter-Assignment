const test = require('node:test');
const assert = require('node:assert/strict');
const { SlidingWindowRateLimiter } = require('./rateLimiter');

function createLimiter({ maxRequests = 5, windowMs = 10_000 } = {}) {
  // An injected clock lets each test advance time without waiting in real time.
  let time = 0;
  const limiter = new SlidingWindowRateLimiter({ maxRequests, windowMs, clock: () => time });
  return { limiter, advance: (milliseconds) => { time += milliseconds; } };
}

test('allows the first request for a client key', () => {
  const { limiter } = createLimiter();
  assert.equal(limiter.allow('client-a'), true);
});

test('allows five requests and rejects the sixth request within 10 seconds', () => {
  const { limiter } = createLimiter();
  assert.equal(limiter.allow('client-a'), true);
  assert.equal(limiter.allow('client-a'), true);
  assert.equal(limiter.allow('client-a'), true);
  assert.equal(limiter.allow('client-a'), true);
  assert.equal(limiter.allow('client-a'), true);
  assert.equal(limiter.allow('client-a'), false);
});

test('limits different client keys independently', () => {
  const { limiter } = createLimiter({ maxRequests: 1 });
  assert.equal(limiter.allow('client-a'), true);
  assert.equal(limiter.allow('client-a'), false);
  assert.equal(limiter.allow('client-b'), true);
});

test('allows a request precisely when the oldest request leaves the window', () => {
  const { limiter, advance } = createLimiter({ maxRequests: 2, windowMs: 1000 });
  assert.equal(limiter.allow('client-a'), true);
  advance(200);
  assert.equal(limiter.allow('client-a'), true);
  advance(799);
  assert.equal(limiter.allow('client-a'), false);
  advance(1);
  assert.equal(limiter.allow('client-a'), true);
});
