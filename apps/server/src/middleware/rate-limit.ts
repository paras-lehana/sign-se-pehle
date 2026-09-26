/**
 * Per-IP token-bucket rate limiter.
 *
 * Responsibility: cap how fast one client can call the API (AI routes cost money and
 * quota) with a smooth refill instead of hard windows. Boundary: in-memory per instance,
 * which is enough at max 3 Cloud Run instances; the clock is injected for tests.
 */
import { appError } from '@sign-se-pehle/core';
import type { RequestHandler } from 'express';
import { sendError } from '../http/respond.js';

/** One minute — the unit the spec's limits are expressed in. */
const WINDOW_MS = 60_000;

/** Sweep idle buckets at most this often so the map cannot grow without bound. */
const SWEEP_INTERVAL_MS = 60_000;

/** Fallback key when the socket has no address (tests, some proxies). */
const UNKNOWN_CLIENT = 'unknown';

export interface RateLimitOptions {
  /** Requests allowed per minute; also the burst size. */
  readonly perMinute: number;
  readonly now: () => number;
}

interface Bucket {
  tokens: number;
  updatedAt: number;
}

/**
 * Creates a limiter middleware; responds 429 `RATE_LIMITED` when a client's bucket is empty.
 * @example
 * app.post('/api/analyze', createRateLimiter({ perMinute: 30, now: Date.now }), handler);
 */
export function createRateLimiter(options: RateLimitOptions): RequestHandler {
  const { perMinute, now } = options;
  const refillPerMs = perMinute / WINDOW_MS;
  const buckets = new Map<string, Bucket>();
  let lastSweep = now();

  const sweep = (at: number): void => {
    // A bucket idle for a full window is back at capacity, so forgetting it changes nothing.
    for (const [key, bucket] of buckets) {
      if (at - bucket.updatedAt >= WINDOW_MS) buckets.delete(key);
    }
    lastSweep = at;
  };

  return (req, res, next) => {
    const at = now();
    if (at - lastSweep >= SWEEP_INTERVAL_MS) sweep(at);
    const key = req.ip ?? UNKNOWN_CLIENT;
    const bucket = buckets.get(key) ?? { tokens: perMinute, updatedAt: at };
    bucket.tokens = Math.min(perMinute, bucket.tokens + (at - bucket.updatedAt) * refillPerMs);
    bucket.updatedAt = at;
    buckets.set(key, bucket);
    if (bucket.tokens < 1) {
      res.setHeader('Retry-After', String(Math.ceil((1 - bucket.tokens) / refillPerMs / 1_000)));
      sendError(res, appError('RATE_LIMITED'));
      return;
    }
    bucket.tokens -= 1;
    next();
  };
}
