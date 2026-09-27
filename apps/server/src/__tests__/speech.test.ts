import { MAX_SPEECH_CHARS, WAV_HEADER_BYTES, appError, err, ok } from '@sign-se-pehle/core';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import type { SpeechClient, SynthesizeRequest } from '../services/speech-client.js';
import { makeApp } from './helpers.js';

const SAMPLE_RATE = 24_000;
/** A tenth of a second of 16-bit mono silence. */
const PCM_BYTES = 4_800;
/** Marker text that must never reach a log line. */
const SPOKEN = 'Your deposit is two months of rent (read-aloud marker 7f3a).';

interface FakeSpeech {
  readonly client: SpeechClient;
  readonly requests: SynthesizeRequest[];
}

function fakeSpeech(outcome: 'ok' | 'fail'): FakeSpeech {
  const requests: SynthesizeRequest[] = [];
  return {
    requests,
    client: {
      configured: true,
      synthesize: (req) => {
        requests.push(req);
        return Promise.resolve(
          outcome === 'ok'
            ? ok({ pcm: new Uint8Array(PCM_BYTES), sampleRate: SAMPLE_RATE, model: 'tts-a', ms: 12 })
            : err(appError('UPSTREAM_FAILURE', 'Read-aloud is unavailable.', 'tts-a: status 500 secret')),
        );
      },
    },
  };
}

describe('POST /api/speech', () => {
  it('returns an uncached WAV file with a PCM header', async () => {
    const speech = fakeSpeech('ok');
    const { app, logs } = makeApp(undefined, {}, speech.client);
    const res = await request(app).post('/api/speech').send({ text: SPOKEN, language: 'hi' }).responseType('blob');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/^audio\/wav/);
    expect(res.headers['cache-control']).toBe('no-store');
    const wav: unknown = res.body;
    expect(Buffer.isBuffer(wav)).toBe(true);
    const bytes = Buffer.isBuffer(wav) ? wav : Buffer.alloc(0);
    expect(bytes.length).toBe(WAV_HEADER_BYTES + PCM_BYTES);
    expect(bytes.toString('ascii', 0, 4)).toBe('RIFF');
    expect(bytes.toString('ascii', 8, 12)).toBe('WAVE');
    expect(bytes.readUInt32LE(24)).toBe(SAMPLE_RATE);
    expect(speech.requests).toEqual([{ text: SPOKEN }]);
    expect(logs.join('\n')).not.toContain('7f3a');
  });

  it('answers 502 when speech is offline so the web can fall back', async () => {
    const res = await request(makeApp().app).post('/api/speech').send({ text: SPOKEN, language: 'en' });
    expect(res.status).toBe(502);
    expect(res.body.error.code).toBe('UPSTREAM_FAILURE');
  });

  it('passes a model failure through without internal detail', async () => {
    const res = await request(makeApp(undefined, {}, fakeSpeech('fail').client).app).post('/api/speech').send({ text: SPOKEN, language: 'en' });
    expect(res.status).toBe(502);
    expect(res.body).toEqual({ error: { code: 'UPSTREAM_FAILURE', message: 'Read-aloud is unavailable.' } });
  });

  it.each([
    ['text that is too long', { text: 'a'.repeat(MAX_SPEECH_CHARS + 1), language: 'en' }],
    ['empty text', { text: '   ', language: 'en' }],
    ['an unknown language', { text: SPOKEN, language: 'xx' }],
  ])('rejects %s with 400', async (_label, invalid) => {
    const speech = fakeSpeech('ok');
    const res = await request(makeApp(undefined, {}, speech.client).app).post('/api/speech').send(invalid);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_FAILED');
    expect(speech.requests).toEqual([]);
  });
});
