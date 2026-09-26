import { describe, expect, it } from 'vitest';
import { appError, httpStatusFor, toPublicError } from '../errors.js';
import { buildAskPrompt } from '../genai/prompts.js';
import { segmentClauses } from '../offline/segment.js';
import { err, mapResult, ok, unwrapOr } from '../result.js';
import { factDeltaSchema, isNumericFactKey } from '../schemas/features.js';

describe('result helpers', () => {
  it('mapResult transforms values and passes errors through', () => {
    expect(mapResult(ok(2), (value) => value * 2)).toEqual(ok(4));
    const failure = err(appError('NOT_FOUND'));
    expect(mapResult(failure, (value: number) => value * 2)).toBe(failure);
  });

  it('unwrapOr returns the value or the fallback', () => {
    expect(unwrapOr(ok(1), 0)).toBe(1);
    expect(unwrapOr(err(appError('INTERNAL')), 0)).toBe(0);
  });
});

describe('errors', () => {
  it('keeps internal hints out of public errors', () => {
    const error = appError('INTERNAL', undefined, 'db down');
    expect(error.internalHint).toBe('db down');
    expect(toPublicError(error)).toEqual({ code: 'INTERNAL', message: error.message });
    expect(httpStatusFor('RATE_LIMITED')).toBe(429);
  });
});

describe('fact delta schema', () => {
  it('accepts only known numeric fact keys', () => {
    expect(isNumericFactKey('monthlyRentInr')).toBe(true);
    expect(isNumericFactKey('executionCity')).toBe(false);
    expect(isNumericFactKey(42)).toBe(false);
    expect(factDeltaSchema.safeParse({ key: 'nope', label: 'x', unit: 'inr', betterFor: 'unknown' }).success).toBe(false);
  });
});

describe('prompt and segment edge cases', () => {
  it('ask prompt without clauses or history has only the document and question', () => {
    const pair = buildAskPrompt({ text: 'Doc', question: 'Q?', history: [], role: 'user', kind: 'online-terms', language: 'en', nonce: 'abcdef12' });
    expect(pair.prompt).not.toContain('CLAUSES');
    expect(pair.prompt).not.toContain('Earlier conversation');
  });

  it('a numbered sentence without a separate heading line gets a short heading or none', () => {
    const segments = segmentClauses('1. Payment: the client pays within 30 days of invoice.\n2. This long clause has no heading and simply keeps talking about many different obligations of both parties.');
    expect(segments[0]?.heading).toBe('Payment');
    expect(segments[1]?.heading).toBe('');
  });
});
