import { GOOGLE_SERVICES } from '@sign-se-pehle/core';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import type { GenAiClient } from '../services/genai-client.js';
import { RENTAL_TEXT, makeApp, makeWebDist } from './helpers.js';

/** One minute, the rate-limit window. */
const MINUTE_MS = 60_000;

describe('health and catalog', () => {
  it('reports status, version and offline AI configuration', async () => {
    const { app } = makeApp();
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      status: 'ok',
      version: '9.9.9',
      ai: { configured: false, models: [] },
      speech: { voices: [] },
    });
    expect(res.headers['cache-control']).toBe('no-store');
  });

  it('lists the Google service catalog', async () => {
    const res = await request(makeApp().app).get('/api/google-services');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ services: JSON.parse(JSON.stringify(GOOGLE_SERVICES)) });
  });
});

describe('error envelope', () => {
  it('returns 400 without echoing any input', async () => {
    const marker = 'INJECTED<script>alert(1)</script>';
    const res = await request(makeApp().app)
      .post('/api/analyze')
      .send({ document: { type: 'text', text: marker }, language: 'xx', [marker]: true });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_FAILED');
    expect(JSON.stringify(res.body)).not.toContain('INJECTED');
    expect(Object.keys(res.body)).toEqual(['error']);
  });

  it('rejects malformed JSON with the envelope', async () => {
    const res = await request(makeApp().app)
      .post('/api/simulate')
      .set('Content-Type', 'application/json')
      .send('{"broken":');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_FAILED');
  });

  it('returns 413 for bodies over the route limit', async () => {
    const res = await request(makeApp().app)
      .post('/api/simulate')
      .send({ padding: 'x'.repeat(70 * 1024) });
    expect(res.status).toBe(413);
    expect(res.body.error.code).toBe('DOCUMENT_TOO_LARGE');
  });

  it('returns a 404 envelope for unknown API routes', async () => {
    const res = await request(makeApp().app).get('/api/nope');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: { code: 'NOT_FOUND', message: expect.any(String) } });
  });

  it('turns unexpected exceptions into a generic 500 without leaking details', async () => {
    const throwing: GenAiClient = {
      configured: true,
      models: ['broken'],
      generateJson: () => Promise.reject(new Error('internal stack detail')),
      generateText: () => Promise.reject(new Error('internal stack detail')),
    };
    const { app, logs } = makeApp(throwing);
    const res = await request(app)
      .post('/api/analyze')
      .send({ document: { type: 'text', text: RENTAL_TEXT }, language: 'en' });
    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe('INTERNAL');
    expect(JSON.stringify(res.body)).not.toContain('internal stack detail');
    expect(logs.some((line) => line.includes('"severity":"ERROR"'))).toBe(true);
  });

  it('returns 404 for non-GET requests outside the API', async () => {
    const res = await request(makeApp().app).post('/somewhere');
    expect(res.status).toBe(404);
  });
});

describe('security headers', () => {
  it('sends a strict CSP and hardening headers', async () => {
    const res = await request(makeApp().app).get('/api/health');
    const csp = String(res.headers['content-security-policy']);
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("script-src 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("media-src 'self' blob:");
    expect(csp).not.toContain('unsafe-inline');
    expect(res.headers['cross-origin-opener-policy']).toBe('same-origin');
    expect(res.headers['cross-origin-resource-policy']).toBe('same-origin');
    expect(res.headers['strict-transport-security']).toContain('max-age=');
    expect(res.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
    expect(res.headers['permissions-policy']).toContain('camera=()');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });
});

describe('rate limiting', () => {
  it('returns 429 once the bucket is empty and refills with time', async () => {
    const { app, clock } = makeApp();
    const statuses: number[] = [];
    for (let i = 0; i < 31; i += 1) {
      const res = await request(app).post('/api/ask').send({});
      statuses.push(res.status);
    }
    expect(statuses.slice(0, 30).every((status) => status === 400)).toBe(true);
    expect(statuses[30]).toBe(429);

    clock.advance(MINUTE_MS);
    const refilled = await request(app).post('/api/ask').send({});
    expect(refilled.status).toBe(400);
  });

  it('evicts idle buckets without changing behaviour', async () => {
    const { app, clock } = makeApp();
    await request(app).get('/api/health');
    clock.advance(2 * MINUTE_MS);
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
  });
});

describe('static web', () => {
  it('serves index.html for client routes with no-cache, and assets as immutable', async () => {
    const webDistDir = makeWebDist();
    const { app } = makeApp(undefined, { webDistDir });
    const page = await request(app).get('/compare');
    expect(page.status).toBe(200);
    expect(page.text).toContain('Sign Se Pehle');
    expect(page.headers['cache-control']).toBe('no-cache');

    const asset = await request(app).get('/assets/app-abc123.js');
    expect(asset.status).toBe(200);
    expect(asset.headers['cache-control']).toContain('immutable');
  });

  it('returns 404 when the web build is missing', async () => {
    const res = await request(makeApp().app).get('/');
    expect(res.status).toBe(404);
  });

  it('writes one structured log line per request', async () => {
    const { app, logs } = makeApp();
    await request(app).get('/api/health');
    const entry: unknown = JSON.parse(logs.at(-1) ?? '{}');
    expect(entry).toMatchObject({ severity: 'INFO', method: 'GET', route: '/api/health', status: 200 });
  });
});
