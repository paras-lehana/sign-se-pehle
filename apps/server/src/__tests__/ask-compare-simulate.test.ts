import {
  askResponseSchema,
  compareResponseSchema,
  monthlyEmi,
  scenarioResultSchema,
} from '@sign-se-pehle/core';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { RENTAL_TEXT, RENTAL_TEXT_REVISED, makeApp, makeClient, scriptedCaller, statusError } from './helpers.js';

/** A sentence copied from the fixture — the only quote a grounded answer may cite. */
const DEPOSIT_SENTENCE = RENTAL_TEXT.split('\n\n').find((line) => line.startsWith('2.')) ?? '';

const askBody = {
  documentText: RENTAL_TEXT,
  kind: 'rental',
  role: 'tenant',
  language: 'en',
  question: 'How much is the security deposit?',
};

describe('POST /api/ask', () => {
  it('returns verified citations from the model answer', async () => {
    const output = {
      answer: 'The deposit is stated in clause 2.',
      citedQuotes: [DEPOSIT_SENTENCE, 'A sentence that is not in the document at all.'],
      answerType: 'answered',
      followUps: ['When is it refunded?'],
    };
    const scripted = scriptedCaller(() => Promise.resolve(JSON.stringify(output)));
    const res = await request(makeApp(makeClient(scripted.caller)).app).post('/api/ask').send(askBody);

    expect(res.status).toBe(200);
    const answer = askResponseSchema.parse(res.body);
    expect(answer.provenance.mode).toBe('gemini');
    expect(answer.citations).toHaveLength(1);
    const span = answer.citations[0]?.span;
    expect(span === undefined ? '' : RENTAL_TEXT.slice(span.start, span.end)).toContain('security deposit');
  });

  it('answers offline when the model fails', async () => {
    const scripted = scriptedCaller(() => Promise.reject(statusError(429)));
    const res = await request(makeApp(makeClient(scripted.caller)).app).post('/api/ask').send(askBody);
    expect(res.status).toBe(200);
    expect(askResponseSchema.parse(res.body).provenance.mode).toBe('offline');
  });
});

describe('POST /api/compare', () => {
  const compareBody = { first: RENTAL_TEXT, second: RENTAL_TEXT_REVISED, language: 'en', kindHint: 'rental' };

  it('combines the model comparison with deterministic fact deltas', async () => {
    const output = {
      summary: 'The second draft lowers the deposit.',
      verdict: 'The second draft is gentler on the tenant.',
      changes: [{ topic: 'Deposit', first: 'Rs. 1,25,000', second: 'Rs. 50,000', change: 'changed', favours: 'second', note: 'Lower deposit.' }],
    };
    const scripted = scriptedCaller(() => Promise.resolve(JSON.stringify(output)));
    const res = await request(makeApp(makeClient(scripted.caller)).app).post('/api/compare').send(compareBody);

    expect(res.status).toBe(200);
    const comparison = compareResponseSchema.parse(res.body);
    expect(comparison.provenance.mode).toBe('gemini');
    expect(comparison.changes).toHaveLength(1);
    expect(comparison.factDeltas.some((delta) => delta.key === 'securityDepositInr')).toBe(true);
  });

  it('compares numbers offline when the model is unavailable', async () => {
    const res = await request(makeApp().app).post('/api/compare').send(compareBody);
    expect(res.status).toBe(200);
    const comparison = compareResponseSchema.parse(res.body);
    expect(comparison.provenance.mode).toBe('offline');
    const deposit = comparison.factDeltas.find((delta) => delta.key === 'securityDepositInr');
    expect(comparison.changes.map((change) => change.topic)).toContain(deposit?.label);
  });
});

describe('POST /api/simulate', () => {
  const principal = 500_000;
  const rate = 12;
  const months = 24;

  it('runs a scenario with the document numbers', async () => {
    const res = await request(makeApp().app)
      .post('/api/simulate')
      .send({
        scenarioId: 'loan-total-cost',
        facts: { loanPrincipalInr: principal, interestRatePercentAnnual: rate, loanTenureMonths: months },
        inputs: {},
      });
    expect(res.status).toBe(200);
    const result = scenarioResultSchema.parse(res.body);
    expect(result.scenarioId).toBe('loan-total-cost');
    const emi = monthlyEmi(principal, rate, months);
    expect(result.totalInr).toBeGreaterThanOrEqual(Math.floor(emi * months) - 1);
  });

  it('explains which facts are missing', async () => {
    const res = await request(makeApp().app)
      .post('/api/simulate')
      .send({ scenarioId: 'loan-total-cost', facts: {}, inputs: {} });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_FAILED');
  });
});
