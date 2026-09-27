import { describe, expect, it } from 'vitest';
import { negotiationModelOutputSchema } from '../genai/model-output.js';
import { negotiableClauses } from '../genai/prompts.js';
import { analyzeOffline } from '../offline/analyze-offline.js';
import { negotiateOffline, suggestionToRequest } from '../offline/negotiate-offline.js';
import { assembleAnalysis } from '../pipeline/assemble-analysis.js';
import { assembleNegotiation } from '../pipeline/assemble-negotiation.js';
import { MAX_NEGOTIATION_ASKS, MAX_WHATSAPP_MESSAGE_CHARS } from '../schemas/limits.js';
import { type NegotiateRequest, negotiateRequestSchema } from '../schemas/requests.js';
import { makeClause, PROVENANCE, RENT_AGREEMENT } from './fixtures.js';

const analysis = assembleAnalysis({
  id: 'o1',
  output: analyzeOffline({ text: RENT_AGREEMENT, language: 'en' }),
  text: RENT_AGREEMENT,
  source: 'text',
  redactions: [],
  language: 'en',
  provenance: PROVENANCE,
});

const request: NegotiateRequest = negotiateRequestSchema.parse({
  kind: analysis.kind,
  role: analysis.role,
  language: 'en',
  tone: 'polite',
  channel: 'email',
  clauses: analysis.clauses,
  flags: analysis.flags,
});

describe('negotiateOffline', () => {
  it('drafts one ask per risky clause in the model output shape', () => {
    const output = negotiateOffline(request);
    expect(negotiationModelOutputSchema.safeParse(output).success).toBe(true);
    expect(output.asks.map((ask) => ask.heading)).toEqual(negotiableClauses(request.clauses).map((clause) => clause.heading));
  });

  it('quotes clause text that assembly can match back to every clause', () => {
    const output = negotiateOffline(request);
    const assembled = assembleNegotiation({ output, clauses: request.clauses, flags: request.flags, provenance: PROVENANCE });
    expect(assembled.asks.map((ask) => ask.clauseId)).toEqual(negotiableClauses(request.clauses).map((clause) => clause.id));
  });

  it('turns a flag suggestion into the request and its detail into the reason', () => {
    const output = negotiateOffline(request);
    const flagged = negotiableClauses(request.clauses).findIndex((clause) => request.flags.some((flag) => flag.clauseIds.includes(clause.id)));
    const flag = request.flags.find((candidate) => candidate.clauseIds.includes(negotiableClauses(request.clauses)[flagged]?.id ?? ''));
    expect(output.asks[flagged]?.proposed).toBe(suggestionToRequest(flag?.suggestion ?? ''));
    expect(output.asks[flagged]?.reason).toBe(flag?.detail);
  });

  it('writes an email with a subject and a sign-off', () => {
    const output = negotiateOffline(request);
    expect(output.subject).toBeDefined();
    expect(output.message).toContain('[Your name]');
    for (const ask of output.asks) expect(output.message).toContain(ask.heading);
  });

  it('keeps a WhatsApp message within the chat limit, summarising what does not fit', () => {
    const long = Array.from({ length: MAX_NEGOTIATION_ASKS }, (_unused, index) =>
      makeClause({ id: `c${index}`, heading: `Clause ${index} ${'with a long heading '.repeat(5)}`, risk: 'high', quote: `Clause ${index} says the tenant pays everything forever.` }),
    );
    const output = negotiateOffline({ ...request, channel: 'whatsapp', clauses: long, flags: [] });
    expect(output).not.toHaveProperty('subject');
    expect(output.message.length).toBeLessThanOrEqual(MAX_WHATSAPP_MESSAGE_CHARS);
    expect(output.message).toMatch(/more points? I can share/);
    expect(negotiateOffline({ ...request, channel: 'whatsapp' }).message.length).toBeLessThanOrEqual(MAX_WHATSAPP_MESSAGE_CHARS);
  });

  it('asks to confirm the terms when nothing is risky, in the chosen tone', () => {
    const calm = [makeClause({ risk: 'low' })];
    const polite = negotiateOffline({ ...request, clauses: calm, flags: [] });
    const firm = negotiateOffline({ ...request, tone: 'firm', clauses: calm, flags: [] });
    expect(polite.asks).toEqual([]);
    expect(polite.message).not.toBe(firm.message);
    expect(polite.message).toMatch(/confirm/);
  });
});

describe('suggestionToRequest', () => {
  it.each([
    ['Consider asking for a lower deposit.', 'Could we agree on a lower deposit?'],
    ['Consider asking to limit your repair duty to minor upkeep.', 'Could we limit my repair duty to minor upkeep?'],
    ['Consider asking the lender to confirm in writing that no charge applies.', 'Could you confirm in writing that no charge applies?'],
    ['Consider asking which companies receive your data.', 'Could you tell me which companies receive my data?'],
    ['Keep a copy of the signed pages.', 'Keep a copy of the signed pages.'],
  ])('rewrites "%s"', (suggestion, expected) => {
    expect(suggestionToRequest(suggestion)).toBe(expected);
  });
});
