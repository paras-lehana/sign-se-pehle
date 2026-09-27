import { describe, expect, it } from 'vitest';
import { LANGUAGES } from '../domain/languages.js';
import { negotiationModelOutputSchema, toGeminiSchema } from '../genai/model-output.js';
import { buildNegotiationPrompt, negotiableClauses, type NegotiationPromptInput } from '../genai/prompts.js';
import { analyzeOffline } from '../offline/analyze-offline.js';
import { assembleAnalysis } from '../pipeline/assemble-analysis.js';
import { MAX_NEGOTIATION_ASKS, MAX_WHATSAPP_MESSAGE_CHARS } from '../schemas/limits.js';
import { makeClause, PROVENANCE, RENT_AGREEMENT } from './fixtures.js';

const NONCE = 'a1b2c3d4e5f60718';

const analysis = assembleAnalysis({
  id: 'p1',
  output: analyzeOffline({ text: RENT_AGREEMENT, language: 'en' }),
  text: RENT_AGREEMENT,
  source: 'text',
  redactions: [],
  language: 'en',
  provenance: PROVENANCE,
});

const base: NegotiationPromptInput = {
  kind: analysis.kind,
  role: analysis.role,
  language: 'hi',
  tone: 'polite',
  channel: 'whatsapp',
  clauses: analysis.clauses,
  flags: analysis.flags,
  nonce: NONCE,
};

describe('negotiableClauses', () => {
  it('keeps only high and medium risk clauses, most severe first', () => {
    const clauses = [makeClause({ id: 'l', risk: 'low' }), makeClause({ id: 'm', risk: 'medium' }), makeClause({ id: 'h', risk: 'high' })];
    expect(negotiableClauses(clauses).map((clause) => clause.id)).toEqual(['h', 'm']);
  });

  it('caps the asks so the request stays focused', () => {
    const many = Array.from({ length: MAX_NEGOTIATION_ASKS + 3 }, (_unused, index) => makeClause({ id: `c${index}`, risk: 'high' }));
    expect(negotiableClauses(many)).toHaveLength(MAX_NEGOTIATION_ASKS);
  });
});

describe('buildNegotiationPrompt', () => {
  it('fences only the risky clauses and the rule concerns as untrusted data', () => {
    const { prompt } = buildNegotiationPrompt(base);
    expect(prompt).toContain(`<<<CLAUSES_${NONCE}>>>`);
    expect(prompt).toContain(`<<<CONCERNS_${NONCE}>>>`);
    for (const clause of analysis.clauses) {
      if (clause.risk === 'low') expect(prompt).not.toContain(clause.quote);
      else expect(prompt).toContain(clause.heading);
    }
    for (const flag of analysis.flags) expect(prompt).toContain(flag.title);
  });

  it('omits the concerns block when there are no flags', () => {
    expect(buildNegotiationPrompt({ ...base, flags: [] }).prompt).not.toContain('CONCERNS');
  });

  it('writes in the chosen language, bans threats and citations, and keeps "current" verbatim', () => {
    const { systemInstruction } = buildNegotiationPrompt(base);
    expect(systemInstruction).toContain(LANGUAGES.hi.englishName);
    expect(systemInstruction).toContain('NEVER cite laws');
    expect(systemInstruction).toMatch(/never threaten/i);
    expect(systemInstruction).toContain('"current"');
    expect(systemInstruction).toContain('never tell the reader whether to sign');
  });

  it('follows the tone and the channel', () => {
    const polite = buildNegotiationPrompt(base).systemInstruction;
    const firm = buildNegotiationPrompt({ ...base, tone: 'firm' }).systemInstruction;
    const email = buildNegotiationPrompt({ ...base, channel: 'email' }).systemInstruction;
    expect(polite).not.toBe(firm);
    expect(polite).toContain(String(MAX_WHATSAPP_MESSAGE_CHARS));
    expect(email).toContain('"subject"');
    expect(email).not.toContain(String(MAX_WHATSAPP_MESSAGE_CHARS));
  });
});

describe('negotiationModelOutputSchema', () => {
  it('tolerates extra keys, needs a message and converts to a Gemini schema', () => {
    expect(negotiationModelOutputSchema.safeParse({ message: 'Hi', asks: [], extra: true }).success).toBe(true);
    expect(negotiationModelOutputSchema.safeParse({ asks: [] }).success).toBe(false);
    expect(toGeminiSchema(negotiationModelOutputSchema).type).toBe('object');
  });
});
