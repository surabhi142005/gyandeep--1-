/**
 * server/services/cache.js
 * Redis caching service for session management and data caching
 * Supports both standard Redis and Upstash (Vercel KV)
 */

import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || process.env.UPSTASH_REDIS_REST_URL || 'redis://localhost:6379';
const SESSION_PREFIX = 'session:';
const CACHE_PREFIX = 'cache:';
const RATE_LIMIT_PREFIX = 'ratelimit:';

let redis = null;
let isConnected = false;
let initErrorLogged = false;

export function initRedis() {
  try {
    const isUpstash = REDIS_URL.includes('upstash.io') || process.env.UPSTASH_REDIS_REST_URL;
    
    if (isUpstash) {
      return initUpstash();
    }
    
    redis = new Redis(REDIS_URL, {
      maxRetriesPerRequest: 3,
      retryDelayOnFailover: 100,
      lazyConnect: true,
      enableOfflineQueue: true,
    });

    redis.on('connect', () => {
      console.log('Redis connected');
      isConnected = true;
    });

    redis.on('error', (error) => {
      if (!initErrorLogged) {
        console.error('Redis error:', error.message);
        initErrorLogged = true;
      }
      isConnected = false;
    });

    redis.on('close', () => {
      if (!initErrorLogged) {
        console.log('Redis connection closed');
        initErrorLogged = true;
      }
      isConnected = false;
    });

    redis.connect().catch((error) => {
      if (!initErrorLogged) {
        console.warn('Redis connection failed:', error.message);
        initErrorLogged = true;
      }
      isConnected = false;
    });

    return redis;
  } catch (error) {
    console.warn('Redis initialization failed:', error.message);
    return null;
  }
}

function initUpstash() {
  const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
  const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
  
  if (!UPSTASH_URL || !UPSTASH_TOKEN) {
    console.warn('Upstash not configured - caching disabled');
    return null;
  }
  
  const { Redis } = require('@upstash/redis');
  
  redis = new Redis({
    url: UPSTASH_URL,
    token: UPSTASH_TOKEN,
  });
  
  isConnected = true;
  console.log('Upstash Redis initialized');
  
  return {
    async get(key) {
      return await redis.get(key);
    },
    async set(key, value, ex) {
      return await redis.set(key, value, { ex });
    },
    async setex(key, seconds, value) {
      return await redis.set(key, value, { ex: seconds });
    },
    async del(key) {
      return await redis.del(key);
    },
    async hset(key, field, value) {
      return await redis.hset(key, field, value);
    },
    async hget(key, field) {
      return await redis.hget(key, field);
    },
    async hgetall(key) {
      return await redis.hgetall(key);
    },
    async exists(key) {
      return await redis.exists(key);
    },
    async expire(key, seconds) {
      return await redis.expire(key, seconds);
    },
    async keys(pattern) {
      return await redis.keys(pattern);
    },
    async zadd(key, score, member) {
      return await redis.zadd(key, { score, member });
    },
    async zremrangebyscore(key, min, max) {
      return await redis.zremrangebyscore(key, min, max);
    },
    async zcard(key) {
      return await redis.zcard(key);
    },
    async zrange(key, start, stop, withScores) {
      return await redis.zrange(key, start, stop, { withScores });
    },
    async publish(channel, message) {
      return await redis.publish(channel, message);
    },
    async ping() {
      return await redis.ping();
    },
    async info(section) {
      return await redis.info(section);
    },
    async dbsize() {
      return await redis.dbsize();
    },
  };
}

export function getRedis() {
  return redis;
}

export function isRedisConnected() {
  return isConnected && redis?.status === 'ready';
}

// ── Session Management ─────────────────────────────────────────────────────────

export async function createSession(userId, data, ttl = 7 * 24 * 60 * 60) {
  if (!redis || !isRedisConnected()) return null;

  try {
    const sessionId = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    const key = `${SESSION_PREFIX}${sessionId}`;

    await redis.hset(key, {
      userId,
      createdAt: Date.now().toString(),
      ...data,
    });

    if (ttl > 0) {
      await redis.expire(key, ttl);
    }

    return sessionId;
  } catch (error) {
    console.error('Create session error:', error);
    return null;
  }
}

export async function getSession(sessionId) {
  if (!redis || !isRedisConnected()) return null;

  try {
    const key = `${SESSION_PREFIX}${sessionId}`;
    const data = await redis.hgetall(key);

    if (!data || Object.keys(data).length === 0) {
      return null;
    }

    return {
      ...data,
      userId: data.userId,
      createdAt: parseInt(data.createdAt, 10),
    };
  } catch (error) {
    console.error('Get session error:', error);
    return null;
  }
}

export async function updateSession(sessionId, data) {
  if (!redis || !isRedisConnected()) return false;

  try {
    const key = `${SESSION_PREFIX}${sessionId}`;
    const exists = await redis.exists(key);

    if (!exists) {
      return false;
    }

    const updates = {};
    for (const [k, v] of Object.entries(data)) {
      if (k !== 'userId' && k !== 'createdAt') {
        updates[k] = typeof v === 'object' ? JSON.stringify(v) : String(v);
      }
    }

    if (Object.keys(updates).length > 0) {
      await redis.hset(key, updates);
    }

    return true;
  } catch (error) {
    console.error('Update session error:', error);
    return false;
  }
}

export async function deleteSession(sessionId) {
  if (!redis || !isRedisConnected()) return false;

  try {
    const key = `${SESSION_PREFIX}${sessionId}`;
    await redis.del(key);
    return true;
  } catch (error) {
    console.error('Delete session error:', error);
    return false;
  }
}

export async function refreshSession(sessionId, ttl = 7 * 24 * 60 * 60) {
  if (!redis || !isRedisConnected()) return false;

  try {
    const key = `${SESSION_PREFIX}${sessionId}`;
    await redis.expire(key, ttl);
    return true;
  } catch (error) {
    console.error('Refresh session error:', error);
    return false;
  }
}

// ── Generic Cache ──────────────────────────────────────────────────────────────

export async function setCache(key, value, ttl = 3600) {
  if (!redis || !isRedisConnected()) return false;

  try {
    const cacheKey = `${CACHE_PREFIX}${key}`;
    const serialized = typeof value === 'object' ? JSON.stringify(value) : String(value);

    await redis.setex(cacheKey, ttl, serialized);
    return true;
  } catch (error) {
    console.error('Set cache error:', error);
    return false;
  }
}

export async function getCache(key) {
  if (!redis || !isRedisConnected()) return null;

  try {
    const cacheKey = `${CACHE_PREFIX}${key}`;
    const data = await redis.get(cacheKey);

    if (!data) return null;

    try {
      return JSON.parse(data);
    } catch {
      return data;
    }
  } catch (error) {
    console.error('Get cache error:', error);
    return null;
  }
}

export async function deleteCache(key) {
  if (!redis || !isRedisConnected()) return false;

  try {
    const cacheKey = `${CACHE_PREFIX}${key}`;
    await redis.del(cacheKey);
    return true;
  } catch (error) {
    console.error('Delete cache error:', error);
    return false;
  }
}

export async function clearCachePattern(pattern) {
  if (!redis || !isRedisConnected()) return 0;

  try {
    const keys = await redis.keys(`${CACHE_PREFIX}${pattern}`);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
    return keys.length;
  } catch (error) {
    console.error('Clear cache pattern error:', error);
    return 0;
  }
}

export async function invalidateCache(prefix) {
  return clearCachePattern(`${prefix}*`);
}

// ── Rate Limiting ─────────────────────────────────────────────────────────────

export async function checkRateLimit(key, limit, windowSeconds) {
  if (!redis || !isRedisConnected()) {
    return { allowed: true, remaining: limit, reset: Date.now() + windowSeconds * 1000 };
  }

  try {
    const rateKey = `${RATE_LIMIT_PREFIX}${key}`;
    const now = Date.now();
    const windowMs = windowSeconds * 1000;
    const windowStart = now - windowMs;

    await redis.zremrangebyscore(rateKey, 0, windowStart);
    const count = await redis.zcard(rateKey);

    if (count >= limit) {
      const oldest = await redis.zrange(rateKey, 0, 0, 'WITHSCORES');
      const reset = oldest.length > 1 ? parseInt(oldest[1], 10) + windowMs : now + windowMs;

      return {
        allowed: false,
        remaining: 0,
        reset,
        retryAfter: Math.ceil((reset - now) / 1000),
      };
    }

    await redis.zadd(rateKey, now, `${now}_${Math.random()}`);
    await redis.expire(rateKey, windowSeconds);

    return {
      allowed: true,
      remaining: limit - count - 1,
      reset: now + windowMs,
    };
  } catch (error) {
    console.error('Rate limit error:', error);
    return { allowed: true, remaining: limit, reset: Date.now() + windowSeconds * 1000 };
  }
}

// ── Pub/Sub ───────────────────────────────────────────────────────────────────

export async function publish(channel, message) {
  if (!redis || !isRedisConnected()) return 0;

  try {
    const data = typeof message === 'object' ? JSON.stringify(message) : String(message);
    return await redis.publish(channel, data);
  } catch (error) {
    console.error('Publish error:', error);
    return 0;
  }
}

export function createSubscriber() {
  if (!redis) return null;

  try {
    const subscriber = redis.duplicate();
    return subscriber;
  } catch (error) {
    console.error('Create subscriber error:', error);
    return null;
  }
}

// ── Utility ───────────────────────────────────────────────────────────────────

export async function getCacheStats() {
  if (!redis || !isRedisConnected()) {
    return { connected: false };
  }

  try {
    const info = await redis.info('memory');
    const keyCount = await redis.dbsize();

    return {
      connected: true,
      keyCount,
      memory: info.split('\n').find(line => line.startsWith('used_memory_human'))?.split(':')[1]?.trim() || 'unknown',
    };
  } catch (error) {
    return { connected: false, error: error.message };
  }
}

export async function healthCheck() {
  if (!redis) {
    return { status: 'not_initialized' };
  }

  if (!isRedisConnected()) {
    return { status: 'disconnected' };
  }

  try {
    await redis.ping();
    return { status: 'healthy' };
  } catch (error) {
    return { status: 'error', error: error.message };
  }
}
