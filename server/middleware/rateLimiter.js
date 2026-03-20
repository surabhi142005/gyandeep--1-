/**
 * server/middleware/rateLimiter.js
 * Rate limiting middleware for Express server
 */

export class RateLimiter {
  constructor(options = {}) {
    this.windowMs = options.windowMs || 60 * 1000;
    this.max = options.max || 100;
    this.message = options.message || { error: 'Too many requests, please try again later' };
    this.store = new Map();
    this.keyGenerator = options.keyGenerator || ((req) => req.ip || req.connection.remoteAddress || 'unknown');
    
    setInterval(() => this.cleanup(), this.windowMs);
  }

  cleanup() {
    const now = Date.now();
    for (const [key, data] of this.store.entries()) {
      if (now > data.resetTime) {
        this.store.delete(key);
      }
    }
  }

  check(key) {
    const now = Date.now();
    let record = this.store.get(key);

    if (!record || now > record.resetTime) {
      record = {
        count: 0,
        resetTime: now + this.windowMs,
      };
      this.store.set(key, record);
    }

    record.count++;
    return {
      allowed: record.count <= this.max,
      remaining: Math.max(0, this.max - record.count),
      resetTime: record.resetTime,
    };
  }

  middleware() {
    return (req, res, next) => {
      const key = this.keyGenerator(req);
      const result = this.check(key);

      res.setHeader('X-RateLimit-Limit', this.max);
      res.setHeader('X-RateLimit-Remaining', result.remaining);
      res.setHeader('X-RateLimit-Reset', Math.ceil(result.resetTime / 1000));

      if (!result.allowed) {
        return res.status(429).json(this.message);
      }

      next();
    };
  }
}

export const strictRateLimiter = new RateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Too many attempts. Please try again in 15 minutes.' },
  keyGenerator: (req) => {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const email = req.body?.email || '';
    return `${ip}:${email}`;
  },
});

export const standardRateLimiter = new RateLimiter({
  windowMs: 60 * 1000,
  max: 100,
  message: { error: 'Too many requests, please try again later' },
});

export const authRateLimiter = new RateLimiter({
  windowMs: 60 * 1000,
  max: 20,
  message: { error: 'Too many authentication requests' },
});
