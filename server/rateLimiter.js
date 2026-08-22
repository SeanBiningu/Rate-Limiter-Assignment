/**
 * In-memory store implementing the small interface a distributed store would use.
 * A Redis-backed adapter, for example, could expose the same get/set/delete methods.
 */
class InMemoryRequestStore {
  constructor() {
    this.entries = new Map();
  }

  get(key) {
    return this.entries.get(key) || [];
  }

  set(key, timestamps) {
    this.entries.set(key, timestamps);
  }

  delete(key) {
    this.entries.delete(key);
  }
}

class SlidingWindowRateLimiter {
  constructor({ maxRequests, windowMs, clock = () => Date.now(), store = new InMemoryRequestStore() }) {
    if (!Number.isInteger(maxRequests) || maxRequests <= 0) throw new Error('maxRequests must be a positive integer');
    if (!Number.isFinite(windowMs) || windowMs <= 0) throw new Error('windowMs must be positive');

    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.clock = clock;
    this.store = store;
  }

  allow(key) {
    if (!key) throw new Error('A client key is required');

    const now = this.clock();
    const activeRequests = this.store.get(key).filter((timestamp) => now - timestamp < this.windowMs);

    if (activeRequests.length >= this.maxRequests) {
      this.store.set(key, activeRequests);
      return false;
    }

    activeRequests.push(now);
    this.store.set(key, activeRequests);
    return true;
  }

  cleanup() {
    const now = this.clock();
    for (const [key, timestamps] of this.store.entries || []) {
      const activeRequests = timestamps.filter((timestamp) => now - timestamp < this.windowMs);
      if (activeRequests.length) this.store.set(key, activeRequests);
      else this.store.delete(key);
    }
  }
}

module.exports = { SlidingWindowRateLimiter, InMemoryRequestStore };
