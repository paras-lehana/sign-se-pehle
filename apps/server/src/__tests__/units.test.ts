import { type Result, ok } from '@sign-se-pehle/core';
import { describe, expect, it } from 'vitest';
import { createJsonLogger } from '../logger.js';
import { createConcurrencyGate } from '../services/concurrency.js';
import { createLruCache } from '../services/lru-cache.js';
import { createProvenanceTracker } from '../services/provenance.js';
import { createFakeClock } from './helpers.js';

describe('lru cache', () => {
  it('evicts the least recently used entry and expires by TTL', () => {
    const clock = createFakeClock();
    const cache = createLruCache<number>({ maxEntries: 2, ttlMs: 1_000, now: clock.now });
    cache.set('a', 1);
    cache.set('b', 2);
    expect(cache.get('a')).toBe(1);
    cache.set('c', 3);
    expect(cache.get('b')).toBeUndefined();
    expect(cache.size).toBe(2);
    clock.advance(1_000);
    expect(cache.get('a')).toBeUndefined();
    expect(cache.get('missing')).toBeUndefined();
  });
});

describe('concurrency gate', () => {
  it('rejects work beyond the cap and frees slots when tasks finish', async () => {
    const gate = createConcurrencyGate(1);
    let release: (value: Result<string>) => void = () => undefined;
    const pending = gate.run(() => new Promise<Result<string>>((resolve) => (release = resolve)));
    expect(gate.inFlight).toBe(1);
    const rejected = await gate.run(() => Promise.resolve(ok('second')));
    expect(rejected.ok ? 'ok' : rejected.error.code).toBe('RATE_LIMITED');
    release(ok('first'));
    expect(await pending).toEqual(ok('first'));
    expect(gate.inFlight).toBe(0);
  });
});

describe('provenance tracker', () => {
  it('records model and rule steps with total latency', () => {
    const clock = createFakeClock();
    const tracker = createProvenanceTracker(clock.now);
    const startedAt = clock.now();
    clock.advance(5);
    tracker.rules('redact', startedAt);
    tracker.model('explain', 'model-a', 1_200);
    tracker.model('again', 'model-a', 10);
    expect(tracker.build('gemini')).toEqual({
      mode: 'gemini',
      models: ['model-a'],
      latencyMs: 5,
      steps: [
        { name: 'redact', engine: 'rules', ms: 5 },
        { name: 'explain', engine: 'model-a', ms: 1_200 },
        { name: 'again', engine: 'model-a', ms: 10 },
      ],
    });
  });
});

describe('json logger', () => {
  it('writes severity, message and flat fields as one line', () => {
    const lines: string[] = [];
    createJsonLogger((line) => lines.push(line)).log('WARNING', 'hello', { n: 1 });
    expect(JSON.parse(lines[0] ?? '{}')).toEqual({ n: 1, severity: 'WARNING', message: 'hello' });
  });
});
