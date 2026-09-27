import { describe, expect, it } from 'vitest';
import { segmentByClauses, type XraySegment } from '../engine/xray.js';
import { analyzeOffline } from '../offline/analyze-offline.js';
import { assembleAnalysis } from '../pipeline/assemble-analysis.js';
import { makeClause, PROVENANCE, RENT_AGREEMENT } from './fixtures.js';

const analysis = assembleAnalysis({
  id: 'x1',
  output: analyzeOffline({ text: RENT_AGREEMENT, language: 'en' }),
  text: RENT_AGREEMENT,
  source: 'text',
  redactions: [],
  language: 'en',
  provenance: PROVENANCE,
});

const TEXT = 'abcdefghijklmnopqrstuvwxyz0123456789ABCD';

/** Every segment is contiguous with the next, and together they reproduce the text exactly. */
function expectCovers(text: string, segments: readonly XraySegment[]): void {
  expect(segments.map((segment) => segment.text).join('')).toBe(text);
  expect(segments[0]?.start).toBe(0);
  expect(segments.at(-1)?.end).toBe(text.length);
  segments.forEach((segment, index) => {
    expect(segment.text).toBe(text.slice(segment.start, segment.end));
    const next = segments[index + 1];
    if (next !== undefined) expect(next.start).toBe(segment.end);
  });
}

describe('segmentByClauses', () => {
  it('covers a real analysed document exactly once and highlights every verified clause', () => {
    const segments = segmentByClauses(analysis.document.text, analysis.clauses);
    expectCovers(analysis.document.text, segments);
    const highlighted = new Set(segments.flatMap((segment) => (segment.clauseId === undefined ? [] : [segment.clauseId])));
    const verified = analysis.clauses.filter((clause) => clause.quoteVerified && clause.span !== undefined).map((clause) => clause.id);
    expect([...highlighted].sort()).toEqual([...verified].sort());
  });

  it('carries each clause risk onto its segments', () => {
    const segments = segmentByClauses(analysis.document.text, analysis.clauses);
    for (const segment of segments) {
      if (segment.clauseId === undefined) continue;
      expect(segment.risk).toBe(analysis.clauses.find((clause) => clause.id === segment.clauseId)?.risk);
    }
  });

  it('gives the overlapping stretch to the higher-risk clause and fills gaps with plain text', () => {
    const low = makeClause({ id: 'low', risk: 'low', span: { start: 0, end: 20 } });
    const high = makeClause({ id: 'high', risk: 'high', span: { start: 10, end: 30 } });
    const segments = segmentByClauses(TEXT, [low, high]);
    expectCovers(TEXT, segments);
    expect(segments.map(({ start, end, clauseId, risk }) => ({ start, end, clauseId, risk }))).toEqual([
      { start: 0, end: 10, clauseId: 'low', risk: 'low' },
      { start: 10, end: 30, clauseId: 'high', risk: 'high' },
      { start: 30, end: TEXT.length, clauseId: undefined, risk: undefined },
    ]);
  });

  it('keeps the earlier clause when equally risky clauses overlap, and resumes the outer clause after an inner one', () => {
    const outer = makeClause({ id: 'outer', risk: 'medium', span: { start: 0, end: 30 } });
    const inner = makeClause({ id: 'inner', risk: 'high', span: { start: 10, end: 20 } });
    const twin = makeClause({ id: 'twin', risk: 'medium', span: { start: 5, end: 25 } });
    const segments = segmentByClauses(TEXT, [outer, inner, twin]);
    expectCovers(TEXT, segments);
    expect(segments.map((segment) => segment.clauseId)).toEqual(['outer', 'inner', 'outer', undefined]);
  });

  it('never highlights unverified quotes and clamps spans to the text', () => {
    const unverified = makeClause({ id: 'u', quoteVerified: false, span: { start: 0, end: 5 } });
    const spanless = makeClause({ id: 's' });
    const overflowing = makeClause({ id: 'o', span: { start: 35, end: 99 } });
    const empty = makeClause({ id: 'e', span: { start: 7, end: 7 } });
    const segments = segmentByClauses(TEXT, [unverified, spanless, overflowing, empty]);
    expectCovers(TEXT, segments);
    expect(segments.map((segment) => segment.clauseId)).toEqual([undefined, 'o']);
  });

  it('returns one plain segment without clauses and nothing for empty text', () => {
    expect(segmentByClauses(TEXT, [])).toEqual([{ start: 0, end: TEXT.length, text: TEXT }]);
    expect(segmentByClauses('', analysis.clauses)).toEqual([]);
  });
});
