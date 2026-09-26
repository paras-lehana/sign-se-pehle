/**
 * Offline keyword classifiers: clause category, signals, risk and document kind.
 *
 * Responsibility: deterministic stand-ins for what Gemini tags, so the offline path
 * feeds the same red-flag rules. Boundary: keyword tables are intentionally simple and
 * English-only; they err towards "other" rather than guessing.
 */
import type { ClauseCategory, ClauseSignal, Favours, RiskLevel } from '../domain/clauses.js';
import type { DocumentKind } from '../domain/document-kinds.js';

/** Ordered: the first matching category wins, so specific topics come before generic ones. */
const CATEGORY_PATTERNS: readonly (readonly [ClauseCategory, RegExp])[] = [
  ['deposit', /security deposit|\bdeposit\b|advance amount/i],
  ['non-compete', /non[- ]?compet|competing business|\bcompetitor|solicit/i],
  ['confidentiality', /confidential|non[- ]?disclosure/i],
  ['intellectual-property', /intellectual property|copyright|patent|trademark/i],
  ['data-privacy', /personal data|privacy|data protection/i],
  ['dispute-resolution', /arbitrat|dispute/i],
  ['governing-law', /governing law|governed by the laws|jurisdiction/i],
  ['indemnity', /indemnif/i],
  ['liability', /liabilit|\bliable\b/i],
  ['exclusion', /exclu|not covered|waiting period/i],
  ['coverage', /sum insured|sum assured|\bcover(?:ed|age)?\b/i],
  ['interest', /rate of interest|interest rate|per annum|\bp\.a\./i],
  ['penalty', /penalt|late fee|liquidated damages|\bfine\b/i],
  ['maintenance', /repair|maintenance|upkeep/i],
  ['renewal', /renew|escalat/i],
  ['termination', /terminat|vacate|cancel|resign|lock[- ]?in/i],
  ['notice', /\bnotice\b/i],
  ['fees', /processing fee|\bcharges?\b|\bfees?\b/i],
  ['payment', /\brent\b|salary|payment|\bpay(?:able)?\b|\bemi\b|premium|consideration|price|stipend/i],
  ['term', /period of|term of|commenc|tenure|duration/i],
  ['parties', /\bbetween\b|hereinafter|residing at/i],
];

const SIGNAL_PATTERNS: readonly (readonly [ClauseSignal, RegExp])[] = [
  ['entry-without-notice', /(?:enter|inspect|visit)[^.]{0,80}(?:any ?time|without (?:any )?(?:prior )?notice)/i],
  ['tenant-structural-repairs', /(?:tenant|licensee|lessee)[^.]{0,80}(?:all|major|structural)[^.]{0,20}repairs?/i],
  ['full-rent-for-lock-in', /(?:rent|licen[cs]e fee)[^.]{0,80}(?:remaining|balance|unexpired|entire)[^.]{0,40}(?:lock[- ]?in|period|term)/i],
  ['unilateral-changes', /(?:reserves the right to|may)\s+(?:modify|amend|change|revise)[^.]{0,80}(?:any ?time|without (?:prior )?notice|sole discretion)/i],
  ['auto-renewal', /automatic(?:ally)?\s+renew|auto[- ]?renew/i],
  ['post-employment-non-compete', /(?:after|following|post)[^.]{0,60}(?:terminat|leav|cessation|resign|employment)[^.]{0,120}(?:compet|join|similar business)|(?:compet|not join)[^.]{0,120}(?:after|following)[^.]{0,40}(?:terminat|leav|cessation|employment)/i],
  ['training-bond', /(?:training|service)\s+bond|bond (?:amount|period)|(?:reimburse|repay)[^.]{0,40}training/i],
  ['one-sided-arbitrator', /arbitrat\w*[^.]{0,80}(?:appointed|nominated|chosen) (?:solely |only )?by the (?:landlord|lender|company|employer|bank|licensor|insurer|builder|developer|promoter)|(?:landlord|lender|company|employer|bank|licensor|insurer|builder|developer|promoter)[^.]{0,40}(?:shall|will|may) (?:appoint|nominate)[^.]{0,30}arbitrator/i],
  ['waiver-of-legal-remedies', /waives?[^.]{0,60}(?:rights?|remed|claims?)|shall not (?:approach|file|initiate)[^.]{0,40}(?:court|forum|authority|proceeding)/i],
  ['data-sharing-third-parties', /(?:share|disclose|transfer|sell)[^.]{0,80}(?:third[- ]part|affiliates|partners)/i],
  ['penal-interest-compounding', /(?:penal|default|overdue)[^.]{0,60}(?:compound|capitali[sz])|compounded[^.]{0,40}(?:penal|overdue)/i],
  ['foreclosure-charges', /(?:fore[- ]?closure|pre[- ]?payment|pre[- ]?closure)[^.]{0,60}(?:charge|fee|penalt)/i],
  ['refund-at-discretion', /refund[^.]{0,60}(?:sole|absolute) discretion|(?:sole|absolute) discretion[^.]{0,60}refund/i],
  ['no-refund', /non[- ]?refundable|no refund/i],
  ['sole-discretion', /sole (?:and absolute )?discretion/i],
  ['one-sided-termination', /(?:landlord|company|employer|lender|licensor)[^.]{0,40}(?:may|can|shall be entitled to) terminat[^.]{0,60}(?:any ?time|without (?:any )?(?:reason|cause|notice))/i],
  ['unlimited-liability', /unlimited liability|liable for (?:all|any and all) (?:losses|damages)/i],
  ['broad-indemnity', /indemnif[^.]{0,80}(?:all|any and all) (?:losses|claims|damages)/i],
];

/** clauseSchema allows six signals per clause. */
const MAX_SIGNALS = 6;

/** Signals that point at the harshest terms (see the matching high-severity rules). */
const HIGH_RISK_SIGNALS: ReadonlySet<ClauseSignal> = new Set([
  'full-rent-for-lock-in',
  'post-employment-non-compete',
  'one-sided-arbitrator',
  'waiver-of-legal-remedies',
  'penal-interest-compounding',
  'foreclosure-charges',
  'unlimited-liability',
]);

/** Categories that usually carry money or rights at risk even without a detected signal. */
const MEDIUM_RISK_CATEGORIES: ReadonlySet<ClauseCategory> = new Set([
  'penalty',
  'termination',
  'indemnity',
  'liability',
  'non-compete',
  'exclusion',
  'deposit',
]);

/**
 * First matching category for a clause, or 'other'.
 * @example
 * classifyCategory('The Tenant shall pay a security deposit'); // 'deposit'
 */
export function classifyCategory(text: string): ClauseCategory {
  return CATEGORY_PATTERNS.find(([, pattern]) => pattern.test(text))?.[0] ?? 'other';
}

/**
 * Every signal a clause matches, capped at the schema limit.
 * @example
 * detectSignals('This agreement shall automatically renew'); // ['auto-renewal']
 */
export function detectSignals(text: string): ClauseSignal[] {
  return SIGNAL_PATTERNS.filter(([, pattern]) => pattern.test(text))
    .map(([signal]) => signal)
    .slice(0, MAX_SIGNALS);
}

/**
 * Risk and tilt for a clause from its signals and category.
 * @example
 * assessClause('other', ['auto-renewal']); // { risk: 'medium', favours: 'other-party' }
 */
export function assessClause(category: ClauseCategory, signals: readonly ClauseSignal[]): { risk: RiskLevel; favours: Favours } {
  if (signals.some((signal) => HIGH_RISK_SIGNALS.has(signal))) return { risk: 'high', favours: 'other-party' };
  if (signals.length > 0) return { risk: 'medium', favours: 'other-party' };
  return { risk: MEDIUM_RISK_CATEGORIES.has(category) ? 'medium' : 'low', favours: 'balanced' };
}

const KIND_PATTERNS: Readonly<Record<Exclude<DocumentKind, 'other'>, readonly RegExp[]>> = {
  rental: [/\brent\b/gi, /tenant|lessee|licensee/gi, /landlord|lessor|licensor/gi, /leave and licen[cs]e/gi, /premises/gi],
  employment: [/employ(?:ee|er|ment)/gi, /salary|\bctc\b|remuneration/gi, /probation/gi, /designation|offer letter|appointment/gi],
  loan: [/\bloan\b/gi, /borrower/gi, /\blender\b/gi, /\bemi\b/gi, /rate of interest|interest rate/gi],
  insurance: [/insur/gi, /policyholder|\bpolicy\b/gi, /premium/gi, /sum insured|sum assured/gi, /\bclaims?\b/gi],
  'online-terms': [/terms of (?:service|use)/gi, /privacy policy/gi, /\busers?\b/gi, /website|platform|\bapp\b/gi, /cookies/gi],
  'property-purchase': [/allottee|allotment/gi, /builder|developer|promoter/gi, /apartment|\bflat\b|unit no/gi, /agreement for sale|sale deed/gi, /carpet area/gi],
  'service-contract': [/service provider|freelanc|consultant|contractor/gi, /deliverables|scope of work|statement of work/gi, /invoice/gi],
};

/** A document needs at least this many keyword hits before we commit to a kind. */
const MIN_KIND_SCORE = 3;

/**
 * Picks the document kind with the most keyword hits, or 'other' below the threshold.
 * @example
 * classifyKind('The Tenant shall pay rent to the Landlord for the premises'); // 'rental'
 */
export function classifyKind(text: string): DocumentKind {
  let best: DocumentKind = 'other';
  let bestScore = MIN_KIND_SCORE - 1;
  for (const [kind, patterns] of Object.entries(KIND_PATTERNS)) {
    const score = patterns.reduce((sum, pattern) => sum + (text.match(pattern)?.length ?? 0), 0);
    if (score > bestScore && isKind(kind)) {
      best = kind;
      bestScore = score;
    }
  }
  return best;
}

function isKind(value: string): value is Exclude<DocumentKind, 'other'> {
  return Object.hasOwn(KIND_PATTERNS, value);
}
