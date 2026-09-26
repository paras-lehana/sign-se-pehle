/**
 * Offline fact extraction by regular expression.
 *
 * Responsibility: pull explicitly stated numbers (rent, deposit, lock-in, notice,
 * salary, bond, interest, tenure, premium, waiting periods…) out of English text so
 * rules, money-at-stake and the simulator work without the model. Boundary: only
 * numbers written as digits next to a keyword; anything ambiguous is left out.
 */
import type { DocumentKind } from '../domain/document-kinds.js';
import { type DocumentFacts, documentFactsSchema, type FactUnit, type NumericFactKey } from '../schemas/facts.js';

const DAYS_PER_MONTH = 30;
const DAYS_PER_YEAR = 365;
const MONTHS_PER_YEAR = 12;

interface FactPattern {
  readonly key: NumericFactKey;
  readonly keyword: string;
  readonly unit: FactUnit;
  readonly kinds: readonly DocumentKind[];
}

const RENTAL: readonly DocumentKind[] = ['rental'];
const JOB: readonly DocumentKind[] = ['employment'];
const LOAN: readonly DocumentKind[] = ['loan'];
const COVER: readonly DocumentKind[] = ['insurance'];
const PROPERTY: readonly DocumentKind[] = ['property-purchase'];
const ANY_TERM: readonly DocumentKind[] = ['rental', 'employment', 'service-contract', 'other'];

/** The first match after each keyword wins; keywords are regex sources matched case-insensitively. */
const FACT_PATTERNS: readonly FactPattern[] = [
  { key: 'monthlyRentInr', keyword: 'monthly rent|rent of|rent (?:is|shall be|payable)|licen[cs]e fee', unit: 'inr', kinds: RENTAL },
  { key: 'securityDepositInr', keyword: 'security deposit|refundable deposit|interest[- ]free deposit|deposit of', unit: 'inr', kinds: RENTAL },
  { key: 'lockInMonths', keyword: 'lock[- ]?in', unit: 'months', kinds: RENTAL },
  { key: 'rentEscalationPercent', keyword: 'escalat\\w*|increase[ds]?|enhance\\w*', unit: 'percent', kinds: RENTAL },
  { key: 'lateFeePerDayInr', keyword: 'late (?:fee|payment charge)s?', unit: 'inr', kinds: ['rental', 'service-contract'] },
  { key: 'agreementTermMonths', keyword: '(?:period|term|duration) of', unit: 'months', kinds: ANY_TERM },
  { key: 'monthlySalaryInr', keyword: 'monthly (?:salary|gross|ctc|stipend|remuneration)|salary of|stipend of', unit: 'inr', kinds: JOB },
  { key: 'nonCompeteMonths', keyword: 'non[- ]?compet\\w*|not (?:join|work for)[^.\\n]{0,60}compet\\w*', unit: 'months', kinds: JOB },
  { key: 'trainingBondInr', keyword: '(?:training|service) bond|bond amount|training cost', unit: 'inr', kinds: JOB },
  { key: 'bondDurationMonths', keyword: 'bond (?:period|duration)|serve the company for', unit: 'months', kinds: JOB },
  { key: 'probationMonths', keyword: 'probation', unit: 'months', kinds: JOB },
  { key: 'loanPrincipalInr', keyword: 'loan amount|principal amount|sanctioned amount|loan of', unit: 'inr', kinds: LOAN },
  { key: 'interestRatePercentAnnual', keyword: 'rate of interest|interest rate|interest', unit: 'percent', kinds: LOAN },
  { key: 'loanTenureMonths', keyword: 'tenure|repayment period|loan term', unit: 'months', kinds: LOAN },
  { key: 'prepaymentPenaltyPercent', keyword: 'pre[- ]?payment|fore[- ]?closure|pre[- ]?closure', unit: 'percent', kinds: LOAN },
  { key: 'processingFeePercent', keyword: 'processing fee', unit: 'percent', kinds: LOAN },
  { key: 'sumInsuredInr', keyword: 'sum insured|sum assured|cover amount', unit: 'inr', kinds: COVER },
  { key: 'annualPremiumInr', keyword: 'annual premium|premium of|premium amount', unit: 'inr', kinds: COVER },
  { key: 'preExistingWaitingMonths', keyword: 'pre[- ]?existing', unit: 'months', kinds: COVER },
  { key: 'freeLookDays', keyword: 'free[- ]?look', unit: 'days', kinds: COVER },
  { key: 'coPaymentPercent', keyword: 'co[- ]?pay\\w*', unit: 'percent', kinds: COVER },
  { key: 'totalConsiderationInr', keyword: 'total (?:price|consideration|cost)|sale consideration', unit: 'inr', kinds: PROPERTY },
  { key: 'bookingAmountInr', keyword: 'booking amount|application money|advance of', unit: 'inr', kinds: PROPERTY },
];

const CURRENCY = '(?:\\u20B9|rs\\.?|inr|rupees)';
const NUMBER = '(\\d[\\d,]*(?:\\.\\d+)?)';
const DURATION = '(\\d{1,4})\\)?\\s*(?:\\([^)]{0,30}\\)\\s*)?(days?|months?|years?)';

function patternFor(fact: FactPattern): RegExp {
  const lead = `(?:${fact.keyword})`;
  switch (fact.unit) {
    case 'inr':
      return new RegExp(`${lead}[^\\d\\n]{0,60}?${CURRENCY}\\s*${NUMBER}`, 'i');
    case 'percent':
      return new RegExp(`${lead}[^\\d\\n%]{0,80}?(\\d{1,3}(?:\\.\\d+)?)\\s*(?:%|per\\s?cent)`, 'i');
    case 'months':
    case 'days':
      return new RegExp(`${lead}[^\\d\\n]{0,80}?${DURATION}`, 'i');
  }
}

/**
 * Converts a written duration to the fact's unit (days or months).
 * @example
 * toUnit(2, 'years', 'months'); // 24
 */
export function toUnit(value: number, written: string, unit: 'days' | 'months'): number {
  const word = written.toLowerCase();
  if (unit === 'months') {
    if (word.startsWith('year')) return value * MONTHS_PER_YEAR;
    return word.startsWith('day') ? Math.round(value / DAYS_PER_MONTH) : value;
  }
  if (word.startsWith('year')) return value * DAYS_PER_YEAR;
  return word.startsWith('month') ? value * DAYS_PER_MONTH : value;
}

function readValue(fact: FactPattern, match: RegExpExecArray): number | undefined {
  const raw = Number((match[1] ?? '').replace(/,/g, ''));
  if (!Number.isFinite(raw)) return undefined;
  if (fact.unit === 'months' || fact.unit === 'days') return toUnit(raw, match[2] ?? '', fact.unit);
  return raw;
}

function fitsSchema(key: NumericFactKey, value: number): boolean {
  return documentFactsSchema.shape[key].safeParse(value).success;
}

const NOTICE_DURATION = new RegExp(DURATION, 'i');

/** Sentence ends before a capital letter, so "Rs. 25,000" is not split mid-amount. */
export const SENTENCE_BREAK = /(?<=[.;])\s+(?=[A-Z(])|\n+/;

/** Who gives notice in each kind: [reader-side words, other-side words, reader fact, other fact]. */
const NOTICE_PARTIES: Readonly<Partial<Record<DocumentKind, readonly [RegExp, RegExp, NumericFactKey, NumericFactKey]>>> = {
  rental: [/tenant|licensee|lessee/i, /landlord|licensor|lessor|owner/i, 'tenantNoticeDays', 'landlordNoticeDays'],
  employment: [/employee|\byou\b/i, /employer|company|management/i, 'employeeNoticeDays', 'employerNoticeDays'],
};

function extractNotice(text: string, kind: DocumentKind, facts: DocumentFacts): void {
  const parties = NOTICE_PARTIES[kind];
  if (parties === undefined) return;
  const [readerWords, otherWords, readerKey, otherKey] = parties;
  for (const sentence of text.split(SENTENCE_BREAK)) {
    if (!/notice/i.test(sentence)) continue;
    const match = NOTICE_DURATION.exec(sentence);
    if (match === null) continue;
    const days = toUnit(Number(match[1]), match[2] ?? '', 'days');
    if (!fitsSchema(readerKey, days)) continue;
    const both = /either party|both parties|each party/i.test(sentence);
    const readerAt = sentence.search(readerWords);
    const otherAt = sentence.search(otherWords);
    const readerFirst = readerAt >= 0 && (otherAt < 0 || readerAt < otherAt);
    const otherFirst = otherAt >= 0 && !readerFirst;
    if ((both || readerFirst) && facts[readerKey] === undefined) facts[readerKey] = days;
    if ((both || otherFirst) && facts[otherKey] === undefined) facts[otherKey] = days;
  }
}

/**
 * Extracts explicitly stated facts for a document kind.
 * @example
 * extractFacts('Monthly rent of Rs. 25,000 is payable', 'rental'); // { monthlyRentInr: 25000 }
 */
export function extractFacts(text: string, kind: DocumentKind): DocumentFacts {
  const facts: DocumentFacts = {};
  for (const fact of FACT_PATTERNS) {
    if (!fact.kinds.includes(kind)) continue;
    const match = patternFor(fact).exec(text);
    const value = match === null ? undefined : readValue(fact, match);
    if (value !== undefined && fitsSchema(fact.key, value)) facts[fact.key] = value;
  }
  extractNotice(text, kind, facts);
  if (kind === 'loan') {
    if (/floating|variable rate|repo[- ]linked|external benchmark/i.test(text)) facts.isFloatingRate = true;
    else if (/fixed (?:rate|interest)/i.test(text)) facts.isFloatingRate = false;
  }
  return facts;
}
