import {
  type Provenance,
  analyzeOffline,
  assembleAnalysis,
  negotiableClauses,
  negotiateOffline,
  negotiateRequestSchema,
  negotiateResponseSchema,
} from '@sign-se-pehle/core';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { RENTAL_TEXT, makeApp, makeClient, scriptedCaller, statusError } from './helpers.js';

const PROVENANCE: Provenance = { mode: 'offline', models: [], latencyMs: 0, steps: [] };

/** The reader's analysis, derived from the fixture exactly as the web would hold it. */
const analysis = assembleAnalysis({
  id: 'neg',
  output: analyzeOffline({ text: RENTAL_TEXT, language: 'en' }),
  text: RENTAL_TEXT,
  source: 'text',
  redactions: [],
  language: 'en',
  provenance: PROVENANCE,
});

const body = {
  kind: analysis.kind,
  role: analysis.role,
  language: 'en',
  tone: 'polite',
  channel: 'email',
  clauses: analysis.clauses,
  flags: analysis.flags,
};

const risky = negotiableClauses(analysis.clauses)[0];
const RISKY_QUOTE = risky?.quote ?? '';

function modelDraft(current: string): string {
  return JSON.stringify({
    subject: 'Requested changes',
    message: 'Hello, could we revisit a few clauses before we go ahead?',
    asks: [
      { heading: risky?.heading ?? 'Clause', current, proposed: 'Fairer wording.', reason: 'It is one-sided.' },
      { heading: 'Invented', current: 'The tenant must pay for the landlord holiday every year.', proposed: 'x', reason: 'y' },
    ],
  });
}

describe('POST /api/negotiate', () => {
  it('drafts with Gemini, keeps only asks that match a clause and adds curated references', async () => {
    const scripted = scriptedCaller(() => Promise.resolve(modelDraft(RISKY_QUOTE)));
    const res = await request(makeApp(makeClient(scripted.caller)).app).post('/api/negotiate').send(body);

    expect(res.status).toBe(200);
    const draft = negotiateResponseSchema.parse(res.body);
    expect(draft.provenance.mode).toBe('gemini');
    expect(draft.provenance.models).toEqual(['model-a']);
    expect(draft.subject).toBe('Requested changes');
    expect(draft.asks.map((ask) => ask.clauseId)).toEqual([risky?.id]);
    const laws = new Set(analysis.flags.flatMap((flag) => (flag.law === undefined ? [] : [flag.law.id])));
    expect(draft.references.map((law) => law.id)).toEqual([...laws]);
  });

  it('sends only risky clauses, fenced, with the no-citation rule', async () => {
    const scripted = scriptedCaller(() => Promise.resolve(modelDraft(RISKY_QUOTE)));
    await request(makeApp(makeClient(scripted.caller)).app).post('/api/negotiate').send(body);
    const call = scripted.calls[0];
    expect(call?.system).toContain('NEVER cite laws');
    expect(call?.prompt).toMatch(/<<<CLAUSES_[a-f0-9]{16}>>>/);
    for (const clause of analysis.clauses.filter((candidate) => candidate.risk === 'low')) {
      expect(call?.prompt).not.toContain(clause.quote);
    }
  });

  it('redacts personal identifiers in clause text before the model sees it', async () => {
    const phone = '98765 43210';
    const withPhone = { ...body, clauses: body.clauses.map((clause) => (clause.id === risky?.id ? { ...clause, quote: `${clause.quote} Call ${phone}.` } : clause)) };
    const scripted = scriptedCaller(() => Promise.resolve(modelDraft(RISKY_QUOTE)));
    const res = await request(makeApp(makeClient(scripted.caller)).app).post('/api/negotiate').send(withPhone);
    expect(res.status).toBe(200);
    expect(scripted.calls[0]?.prompt).not.toContain(phone);
    expect(scripted.calls[0]?.prompt).toContain('[PHONE]');
  });

  it('falls back to the offline drafter when the model fails', async () => {
    const scripted = scriptedCaller(() => Promise.reject(statusError(503)));
    const { app, logs } = makeApp(makeClient(scripted.caller));
    const res = await request(app).post('/api/negotiate').send({ ...body, channel: 'whatsapp' });

    expect(res.status).toBe(200);
    const draft = negotiateResponseSchema.parse(res.body);
    expect(draft.provenance.mode).toBe('offline');
    const expected = negotiateOffline(negotiateRequestSchema.parse({ ...body, channel: 'whatsapp' }));
    expect(draft.asks.map((ask) => ask.heading)).toEqual(expected.asks.map((ask) => ask.heading));
    expect(draft.subject).toBeUndefined();
    expect(logs.some((line) => line.includes('negotiation fell back to offline'))).toBe(true);
  });

  it('drafts offline without an API key', async () => {
    const res = await request(makeApp().app).post('/api/negotiate').send(body);
    expect(res.status).toBe(200);
    expect(negotiateResponseSchema.parse(res.body).provenance.mode).toBe('offline');
  });

  it.each([
    ['no clauses', { ...body, clauses: [] }],
    ['an unknown tone', { ...body, tone: 'angry' }],
    ['an unknown field', { ...body, extra: true }],
  ])('rejects %s with 400', async (_label, invalid) => {
    const res = await request(makeApp().app).post('/api/negotiate').send(invalid);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_FAILED');
  });
});
