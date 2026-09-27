import { describe, expect, it } from 'vitest';
import type { NegotiationModelOutput } from '../genai/model-output.js';
import { LAWS } from '../knowledge/laws.js';
import { analyzeOffline } from '../offline/analyze-offline.js';
import { assembleAnalysis } from '../pipeline/assemble-analysis.js';
import { assembleNegotiation, MIN_CURRENT_CHARS } from '../pipeline/assemble-negotiation.js';
import type { RedFlag } from '../schemas/analysis.js';
import { negotiateResponseSchema } from '../schemas/features.js';
import { MAX_NEGOTIATION_ASKS } from '../schemas/limits.js';
import { PROVENANCE, RENT_AGREEMENT } from './fixtures.js';

const analysis = assembleAnalysis({
  id: 'n1',
  output: analyzeOffline({ text: RENT_AGREEMENT, language: 'en' }),
  text: RENT_AGREEMENT,
  source: 'text',
  redactions: [],
  language: 'en',
  provenance: PROVENANCE,
});

const risky = analysis.clauses.find((clause) => clause.risk === 'high') ?? analysis.clauses[0];
/** The last line of a real clause quote — what a model is asked to copy into "current". */
const SENTENCE = risky?.quote.split('\n').at(-1) ?? '';

function ask(current: string): NegotiationModelOutput['asks'][number] {
  return { heading: 'Lock-in', current, proposed: 'A one-month exit fee instead.', reason: 'Leaving early should not cost months of rent.' };
}

function assemble(output: NegotiationModelOutput, flags: readonly RedFlag[] = analysis.flags) {
  return assembleNegotiation({ output, clauses: analysis.clauses, flags, provenance: PROVENANCE });
}

describe('assembleNegotiation', () => {
  it('keeps asks whose wording is in a clause quote and attaches that clause id', () => {
    const result = assemble({ message: 'Hello', asks: [ask(SENTENCE), ask('Pets are allowed in the flat at all times.')] });
    expect(negotiateResponseSchema.safeParse(result).success).toBe(true);
    expect(result.asks).toHaveLength(1);
    expect(result.asks[0]?.clauseId).toBe(analysis.clauses.find((clause) => clause.quote.includes(SENTENCE))?.id);
  });

  it('tolerates case, spacing, wrapping quotes and a trailing ellipsis', () => {
    const loose = `“${SENTENCE.toUpperCase().replace(/ /g, '  ')}…”`;
    expect(assemble({ message: 'Hello', asks: [ask(loose)] }).asks).toHaveLength(1);
  });

  it('drops fragments too short to identify a clause', () => {
    const fragment = SENTENCE.slice(0, MIN_CURRENT_CHARS - 1);
    expect(assemble({ message: 'Hello', asks: [ask(fragment)] }).asks).toEqual([]);
  });

  it('caps the number of asks', () => {
    const output = { message: 'Hello', asks: Array.from({ length: MAX_NEGOTIATION_ASKS + 2 }, () => ask(SENTENCE)) };
    expect(assemble(output).asks).toHaveLength(MAX_NEGOTIATION_ASKS);
  });

  it('references each curated law behind the flags once, in flag order', () => {
    const expected = [...new Map(analysis.flags.flatMap((flag) => (flag.law === undefined ? [] : [[flag.law.id, flag.law] as const]))).values()];
    expect(expected.length).toBeGreaterThan(0);
    expect(assemble({ message: 'Hello', asks: [] }).references).toEqual(expected);
  });

  it('never returns a law the caller made up', () => {
    const curated = LAWS['contract-act-s74'];
    const forged: RedFlag[] = [
      { ruleId: 'x', severity: 'high', title: 't', detail: 'd', suggestion: 's', clauseIds: [], law: { ...curated, summary: 'Anything goes.' } },
      { ruleId: 'y', severity: 'high', title: 't', detail: 'd', suggestion: 's', clauseIds: [], law: { ...curated, id: 'invented-law' } },
    ];
    expect(assemble({ message: 'Hello', asks: [] }, forged).references).toEqual([curated]);
  });

  it('keeps a subject only when the draft has one', () => {
    expect(assemble({ subject: 'Changes', message: 'Hello', asks: [] }).subject).toBe('Changes');
    expect(assemble({ message: 'Hello', asks: [] })).not.toHaveProperty('subject');
  });
});
