import { describe, expect, it } from 'vitest';
import { findAmountMismatches } from '../engine/amount-words.js';
import { evaluateRedFlags } from '../engine/red-flags.js';
import { buildGoogleCalendarUrl, buildMapsSearchUrl } from '../integrations/google-links.js';
import { GOOGLE_SERVICES, googleServicesResponseSchema } from '../google/service-catalog.js';
import { analysisModelOutputSchema, askModelOutputSchema } from '../genai/model-output.js';
import { analyzeOffline, findKeyDates } from '../offline/analyze-offline.js';
import { askOffline } from '../offline/ask-offline.js';
import { classifyCategory, classifyKind, detectSignals } from '../offline/classify.js';
import { extractFacts, toUnit } from '../offline/extract-facts.js';
import { segmentClauses, verbatimPrefix } from '../offline/segment.js';
import { assembleAnalysis } from '../pipeline/assemble-analysis.js';
import { assembleAsk, UNSUPPORTED_ANSWER_MESSAGE } from '../pipeline/assemble-ask.js';
import { assembleCompare } from '../pipeline/assemble-compare.js';
import { analysisSchema } from '../schemas/analysis.js';
import { PROVENANCE, RENT_AGREEMENT } from './fixtures.js';

const output = analyzeOffline({ text: RENT_AGREEMENT, language: 'en' });
const analysis = assembleAnalysis({ id: 'a1', output, text: RENT_AGREEMENT, source: 'text', redactions: [], language: 'en', provenance: PROVENANCE });

describe('offline analyzer on a rent agreement', () => {
  it('returns the model output shape', () => {
    expect(analysisModelOutputSchema.safeParse(output).success).toBe(true);
  });

  it('detects the rental kind', () => {
    expect(output.kind).toBe('rental');
  });

  it('extracts the stated facts', () => {
    expect(output.facts).toMatchObject({ monthlyRentInr: 25_000, securityDepositInr: 150_000, lockInMonths: 6, tenantNoticeDays: 60, landlordNoticeDays: 15, rentEscalationPercent: 15, lateFeePerDayInr: 500, agreementTermMonths: 11 });
  });

  it('segments numbered clauses with headings', () => {
    expect(output.clauses.map((clause) => clause.heading)).toContain('SECURITY DEPOSIT');
  });

  it('tags signals the rules act on', () => {
    const signals = output.clauses.flatMap((clause) => clause.signals);
    expect(signals).toEqual(expect.arrayContaining(['entry-without-notice', 'tenant-structural-repairs', 'full-rent-for-lock-in', 'one-sided-arbitrator']));
  });

  it('says offline mode explains in English, with a note for other languages', () => {
    expect(output.summary.oneLine).toMatch(/English/);
    expect(analyzeOffline({ text: RENT_AGREEMENT, language: 'hi' }).summary.oneLine).toMatch(/Gemini/);
  });

  it('finds the execution date and obligations', () => {
    expect(output.keyDates[0]?.isoDate).toBe('2026-04-01');
    expect(output.obligations.yours.length).toBeGreaterThan(0);
    expect(output.obligations.theirs.length).toBeGreaterThan(0);
  });

  it('respects a kind hint', () => {
    expect(analyzeOffline({ text: RENT_AGREEMENT, language: 'en', kindHint: 'other' }).kind).toBe('other');
  });
});

describe('assembleAnalysis end to end', () => {
  it('produces a schema-valid analysis', () => {
    expect(analysisSchema.safeParse(analysis).success).toBe(true);
  });

  it('assigns sequential clause ids and verifies every offline quote', () => {
    expect(analysis.clauses.map((clause) => clause.id)).toEqual(analysis.clauses.map((_clause, index) => `c${index + 1}`));
    expect(analysis.clauses.every((clause) => clause.quoteVerified && clause.span !== undefined)).toBe(true);
  });

  it('resolves the default role and computes the same flags as the rule engine', () => {
    expect(analysis.role).toBe('tenant');
    expect(analysis.flags).toEqual(evaluateRedFlags({ kind: 'rental', role: 'tenant', facts: analysis.facts, clauses: analysis.clauses }));
  });

  it('merges the rule-found amount mismatch', () => {
    expect(analysis.inconsistencies).toEqual(findAmountMismatches(RENT_AGREEMENT));
  });

  it('marks invented quotes unverified and drops them when the heading is blank', () => {
    const fake = { heading: 'Pets', quote: 'Pets are allowed in the flat at all times', plainMeaning: 'x', category: 'other' as const, risk: 'low' as const, favours: 'balanced' as const, signals: [] };
    const headless = { ...fake, heading: ' ' };
    const result = assembleAnalysis({ id: 'a2', output: { ...output, clauses: [fake, headless] }, text: RENT_AGREEMENT, source: 'text', redactions: [], language: 'en', provenance: PROVENANCE });
    expect(result.clauses).toHaveLength(1);
    expect(result.clauses[0]?.quoteVerified).toBe(false);
    expect(result.clauses[0]?.span).toBeUndefined();
  });

  it('adds ai inconsistencies after rule ones and keeps a requested role', () => {
    const result = assembleAnalysis({ id: 'a3', output: { ...output, inconsistencies: ['Dates disagree.'] }, text: RENT_AGREEMENT, source: 'pdf', redactions: [{ type: 'phone', count: 1 }], role: 'landlord', language: 'en', provenance: PROVENANCE });
    expect(result.inconsistencies.at(-1)).toEqual({ source: 'ai', description: 'Dates disagree.', clauseIds: [] });
    expect(result.role).toBe('landlord');
    expect(result.flags.every((flag) => ['one-sided-arbitrator', 'refund-at-discretion'].includes(flag.ruleId))).toBe(true);
  });
});

describe('ask offline and assembleAsk', () => {
  it('answers from the most relevant clause with verified citations', () => {
    const answer = assembleAsk({ output: askOffline({ text: RENT_AGREEMENT, question: 'How much is the security deposit?' }), text: RENT_AGREEMENT, provenance: PROVENANCE });
    expect(answer.answerType).toBe('answered');
    expect(answer.citations[0]?.quote).toContain('security deposit');
  });

  it('returns not-in-document when nothing matches', () => {
    expect(askOffline({ text: RENT_AGREEMENT, question: 'Are pets allowed?' }).answerType).toBe('not-in-document');
  });

  it('routes advice questions to a lawyer', () => {
    expect(askOffline({ text: RENT_AGREEMENT, question: 'Should I sign this deposit clause?' }).answerType).toBe('needs-lawyer');
  });

  it('uses supplied clauses when given', () => {
    const result = askOffline({ text: RENT_AGREEMENT, question: 'arbitrator', clauses: analysis.clauses });
    expect(askModelOutputSchema.safeParse(result).success).toBe(true);
    expect(result.citedQuotes[0]).toContain('arbitrator');
  });

  it('downgrades an answered reply with no verifiable quote', () => {
    const result = assembleAsk({ output: { answer: 'Yes.', citedQuotes: ['Invented sentence not in the text at all'], answerType: 'answered', followUps: ['Next?'] }, text: RENT_AGREEMENT, provenance: PROVENANCE });
    expect(result).toMatchObject({ answerType: 'not-in-document', answer: UNSUPPORTED_ANSWER_MESSAGE, citations: [] });
  });

  it('deduplicates citations pointing at the same span', () => {
    const quote = 'The Tenant shall bear the cost of all major and structural repairs to the premises.';
    const result = assembleAsk({ output: { answer: 'Repairs.', citedQuotes: [quote, quote], answerType: 'answered', followUps: [] }, text: RENT_AGREEMENT, provenance: PROVENANCE });
    expect(result.citations).toHaveLength(1);
    expect(RENT_AGREEMENT.slice(result.citations[0]?.span.start, result.citations[0]?.span.end)).toBe(quote);
  });
});

describe('assembleCompare', () => {
  it('keeps optional sides only when present', () => {
    const result = assembleCompare({
      output: { summary: 'S', verdict: 'V', changes: [{ topic: 'Deposit', second: 'Two months', change: 'added', favours: 'second', note: 'n' }] },
      factDeltas: [],
      provenance: PROVENANCE,
    });
    expect(result.changes[0]).toEqual({ topic: 'Deposit', second: 'Two months', change: 'added', favours: 'second', note: 'n' });
  });
});

describe('offline helpers', () => {
  it.each([
    ['The Tenant shall pay a security deposit', 'deposit'],
    ['Any dispute shall be referred to arbitration', 'dispute-resolution'],
    ['The employee shall not join a competitor', 'non-compete'],
    ['Nothing relevant here at all', 'other'],
  ] as const)('classifyCategory("%s") is %s', (text, category) => {
    expect(classifyCategory(text)).toBe(category);
  });

  it.each([
    ['The employee salary and probation terms of employment for the employer', 'employment'],
    ['The borrower shall repay the loan to the lender in EMI instalments', 'loan'],
    ['The insurer pays claims under this policy after the premium is paid', 'insurance'],
    ['Hello world', 'other'],
  ] as const)('classifyKind detects %s', (text, kind) => {
    expect(classifyKind(text)).toBe(kind);
  });

  it('detects signals and caps them', () => {
    expect(detectSignals('This plan will automatically renew each year.')).toEqual(['auto-renewal']);
    expect(detectSignals('Plain words.')).toEqual([]);
  });

  it('extracts loan and employment facts', () => {
    expect(extractFacts('Loan amount of Rs. 5,00,000 at an interest rate of 11.5% per annum, floating rate, tenure of 5 years.', 'loan')).toMatchObject({ loanPrincipalInr: 500_000, interestRatePercentAnnual: 11.5, loanTenureMonths: 60, isFloatingRate: true });
    expect(extractFacts('Monthly salary of Rs. 50,000. The employee must give 90 days notice. Service bond of Rs. 2,00,000.', 'employment')).toMatchObject({ monthlySalaryInr: 50_000, employeeNoticeDays: 90, trainingBondInr: 200_000 });
    expect(extractFacts('Either party may terminate with 1 month notice.', 'rental')).toMatchObject({ tenantNoticeDays: 30, landlordNoticeDays: 30 });
  });

  it('toUnit converts written durations', () => {
    expect(toUnit(2, 'years', 'months')).toBe(24);
    expect(toUnit(60, 'days', 'months')).toBe(2);
    expect(toUnit(1, 'year', 'days')).toBe(365);
    expect(toUnit(2, 'months', 'days')).toBe(60);
  });

  it('segmentClauses keeps quotes verbatim and verbatimPrefix cuts on a word', () => {
    const segments = segmentClauses('1. RENT\nThe tenant pays rent monthly.\n\n2. DEPOSIT\nA deposit of two months is payable.');
    expect(segments.map((segment) => segment.heading)).toEqual(['RENT', 'DEPOSIT']);
    expect(verbatimPrefix('one two three', 9)).toBe('one two');
  });

  it('findKeyDates reads named-month dates and skips impossible ones', () => {
    expect(findKeyDates('Possession by 5th January 2027.')[0]?.isoDate).toBe('2027-01-05');
    expect(findKeyDates('On 31/02/2026.')[0]?.isoDate).toBeUndefined();
  });
});

describe('google links and catalog', () => {
  it('builds an all-day calendar link ending the next day', () => {
    const url = buildGoogleCalendarUrl({ title: 'Rent due', isoDate: '2026-12-31', details: 'Clause 1' });
    expect(url).toContain('action=TEMPLATE');
    expect(url).toContain('text=Rent%20due');
    expect(url).toContain('dates=20261231/20270101');
    expect(url.startsWith('https://calendar.google.com/calendar/render?')).toBe(true);
  });

  it('omits dates for an invalid ISO date', () => {
    expect(buildGoogleCalendarUrl({ title: 'x', isoDate: '2026-02-30', details: '' })).not.toContain('dates=');
  });

  it('builds a maps search link', () => {
    expect(buildMapsSearchUrl(' DLSA Pune ')).toBe('https://www.google.com/maps/search/?api=1&query=DLSA%20Pune');
  });

  it('catalog is schema-valid with unique ids and env var names only', () => {
    expect(googleServicesResponseSchema.safeParse({ services: GOOGLE_SERVICES }).success).toBe(true);
    expect(new Set(GOOGLE_SERVICES.map((service) => service.id)).size).toBe(GOOGLE_SERVICES.length);
  });
});
