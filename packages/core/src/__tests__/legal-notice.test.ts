import { describe, expect, it } from 'vitest';
import { DOCUMENT_KINDS, KIND_PROFILES, resolveRole } from '../domain/document-kinds.js';
import { computeReplyDeadline } from '../engine/deadline.js';
import { buildAnalysisPrompt } from '../genai/prompts.js';
import { routesForKind } from '../knowledge/forums.js';
import { analyzeOffline, findKeyDates } from '../offline/analyze-offline.js';
import { classifyKind } from '../offline/classify.js';
import { extractFacts } from '../offline/extract-facts.js';
import { checklistFor, KIND_CHECKLIST } from '../offline/templates.js';
import { assembleAnalysis } from '../pipeline/assemble-analysis.js';
import { analysisSchema } from '../schemas/analysis.js';
import { documentFactsSchema, FACT_DEFINITIONS } from '../schemas/facts.js';
import { LEGAL_NOTICE, PROVENANCE, RENT_AGREEMENT } from './fixtures.js';

const output = analyzeOffline({ text: LEGAL_NOTICE, language: 'en' });

describe('legal-notice kind', () => {
  it('is a document kind with a single "party" role and no scenarios', () => {
    expect(DOCUMENT_KINDS).toContain('legal-notice');
    expect(KIND_PROFILES['legal-notice']).toMatchObject({ label: 'Legal notice / demand letter', defaultRole: 'party', roles: ['party'], scenarios: [] });
    expect(resolveRole('legal-notice', 'tenant')).toBe('party');
  });

  it('describes the response period fact for notices only', () => {
    expect(FACT_DEFINITIONS.responseDays).toEqual({ label: 'Days given to respond', unit: 'days', betterWhen: 'higher', kinds: ['legal-notice'] });
  });

  it('accepts a notice date and response days, and rejects an impossible date', () => {
    expect(documentFactsSchema.safeParse({ noticeDate: '2026-09-10', responseDays: 15 }).success).toBe(true);
    expect(documentFactsSchema.safeParse({ noticeDate: '2026-02-30' }).success).toBe(false);
    expect(documentFactsSchema.safeParse({ noticeDate: '10/09/2026' }).success).toBe(false);
  });
});

describe('offline reading of a legal notice', () => {
  it('classifies the notice from its keywords', () => {
    expect(classifyKind(LEGAL_NOTICE)).toBe('legal-notice');
    expect(classifyKind(RENT_AGREEMENT)).toBe('rental');
  });

  it('extracts the response window and the first date as the notice date', () => {
    expect(extractFacts(LEGAL_NOTICE, 'legal-notice').responseDays).toBe(15);
    expect(output.facts.responseDays).toBe(15);
    expect(output.facts.noticeDate).toBe(findKeyDates(LEGAL_NOTICE)[0]?.isoDate);
  });

  it('does not set a notice date for other kinds', () => {
    expect(analyzeOffline({ text: LEGAL_NOTICE, language: 'en', kindHint: 'other' }).facts.noticeDate).toBeUndefined();
  });

  it('skips signing checks and asks a reply-focused lawyer question', () => {
    expect(checklistFor('legal-notice')).toEqual(KIND_CHECKLIST['legal-notice']);
    expect(output.checklist).toEqual(KIND_CHECKLIST['legal-notice']);
    const rental = analyzeOffline({ text: RENT_AGREEMENT, language: 'en' });
    expect(output.lawyerQuestions.at(-1)).not.toBe(rental.lawyerQuestions.at(-1));
    expect(output.lawyerQuestions.at(-1)).toMatch(/reply/);
  });

  it('assembles a schema-valid analysis whose facts feed the reply countdown and forums', () => {
    const analysis = assembleAnalysis({ id: 'n1', output, text: LEGAL_NOTICE, source: 'text', redactions: [], language: 'en', provenance: PROVENANCE });
    expect(analysisSchema.safeParse(analysis).success).toBe(true);
    expect(analysis.kind).toBe('legal-notice');
    const { noticeDate, responseDays } = analysis.facts;
    expect(noticeDate).toBeDefined();
    expect(responseDays).toBeDefined();
    const deadline = computeReplyDeadline({ noticeIsoDate: noticeDate ?? '', responseDays: responseDays ?? 0, todayIso: noticeDate ?? '' });
    expect(deadline.ok ? deadline.value.daysLeft : -1).toBe(responseDays);
    expect(routesForKind(analysis.kind).length).toBeGreaterThanOrEqual(2);
  });
});

describe('analysis prompt for notices', () => {
  it('asks the model to extract the notice date and response days', () => {
    const { systemInstruction } = buildAnalysisPrompt({ text: LEGAL_NOTICE, language: 'en', nonce: 'a1b2c3d4' });
    expect(systemInstruction).toContain('"legal-notice"');
    expect(systemInstruction).toContain('noticeDate');
    expect(systemInstruction).toContain('responseDays');
  });
});
