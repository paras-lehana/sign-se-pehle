import { analysisSchema, analyzeOffline, redactPii } from '@sign-se-pehle/core';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createOfflineGenAiClient } from '../services/genai-client.js';
import { RENTAL_TEXT, makeApp, makeClient, scriptedCaller, statusError } from './helpers.js';

const FABRICATED_HEADING = 'Invented clause';

/** What a well-behaved model returns: derived from the offline analyser, plus one invented quote. */
function modelOutputFor(text: string): string {
  const output = analyzeOffline({ text: redactPii(text).text, language: 'en' });
  const invented = {
    ...output.clauses[0],
    heading: FABRICATED_HEADING,
    quote: 'The tenant must also pay for the landlord holiday every year.',
  };
  return JSON.stringify({ ...output, clauses: [...output.clauses, invented] });
}

const textBody = { document: { type: 'text', text: RENTAL_TEXT }, language: 'en' };
const fileBody = {
  document: { type: 'file', mimeType: 'application/pdf', fileName: 'rent.pdf', dataBase64: 'JVBERi0xLjQK' },
  language: 'en',
  role: 'tenant',
};

describe('POST /api/analyze', () => {
  it('explains with Gemini, verifies quotes and raises flags', async () => {
    const scripted = scriptedCaller(() => Promise.resolve(modelOutputFor(RENTAL_TEXT)));
    const { app } = makeApp(makeClient(scripted.caller));
    const res = await request(app).post('/api/analyze').send(textBody);

    expect(res.status).toBe(200);
    expect(analysisSchema.safeParse(res.body).success).toBe(true);
    const analysis = analysisSchema.parse(res.body);
    expect(analysis.provenance.mode).toBe('gemini');
    expect(analysis.provenance.models).toEqual(['model-a']);
    expect(analysis.flags.length).toBeGreaterThan(0);
    const invented = analysis.clauses.find((clause) => clause.heading === FABRICATED_HEADING);
    expect(invented?.quoteVerified).toBe(false);
    expect(analysis.clauses.some((clause) => clause.quoteVerified)).toBe(true);
  });

  it('falls back to the offline analyser when every model fails', async () => {
    const scripted = scriptedCaller(() => Promise.reject(statusError(503)));
    const { app, logs } = makeApp(makeClient(scripted.caller));
    const res = await request(app).post('/api/analyze').send(textBody);

    expect(res.status).toBe(200);
    const analysis = analysisSchema.parse(res.body);
    expect(analysis.provenance.mode).toBe('offline');
    expect(analysis.flags.length).toBeGreaterThan(0);
    expect(logs.join('\n')).not.toContain('secret body');
  });

  it('runs offline when no key is configured', async () => {
    const res = await request(makeApp(createOfflineGenAiClient()).app).post('/api/analyze').send(textBody);
    expect(res.status).toBe(200);
    expect(analysisSchema.parse(res.body).provenance.mode).toBe('offline');
  });

  it('serves a repeat from cache without a second model call', async () => {
    const scripted = scriptedCaller(() => Promise.resolve(modelOutputFor(RENTAL_TEXT)));
    const { app } = makeApp(makeClient(scripted.caller));
    const first = await request(app).post('/api/analyze').send(textBody);
    const second = await request(app).post('/api/analyze').send(textBody);

    expect(second.status).toBe(200);
    expect(second.body.id).toBe(first.body.id);
    expect(scripted.calls).toHaveLength(1);
  });

  it('transcribes an uploaded PDF before explaining it', async () => {
    const scripted = scriptedCaller((call) =>
      Promise.resolve(call.jsonSchema === undefined ? RENTAL_TEXT : modelOutputFor(RENTAL_TEXT)),
    );
    const { app } = makeApp(makeClient(scripted.caller));
    const res = await request(app).post('/api/analyze').send(fileBody);

    expect(res.status).toBe(200);
    const analysis = analysisSchema.parse(res.body);
    expect(analysis.document.source).toBe('pdf');
    expect(analysis.provenance.steps.map((step) => step.name)).toContain('transcribe');
    expect(scripted.calls[0]?.files[0]?.mimeType).toBe('application/pdf');
  });

  it('asks for pasted text when a file arrives in offline mode', async () => {
    const res = await request(makeApp(createOfflineGenAiClient()).app).post('/api/analyze').send(fileBody);
    expect(res.status).toBe(415);
    expect(res.body.error.code).toBe('UNSUPPORTED_DOCUMENT');
  });

  it('reports an upstream failure when transcription fails', async () => {
    const scripted = scriptedCaller(() => Promise.reject(statusError(500)));
    const res = await request(makeApp(makeClient(scripted.caller)).app).post('/api/analyze').send(fileBody);
    expect(res.status).toBe(502);
    expect(res.body.error.message).not.toContain('secret');
  });

  it('rejects a file with too little readable text', async () => {
    const scripted = scriptedCaller(() => Promise.resolve('blurry'));
    const res = await request(makeApp(makeClient(scripted.caller)).app).post('/api/analyze').send(fileBody);
    expect(res.status).toBe(415);
  });
});
