/**
 * Clause vocabulary: categories, risk levels and the "signals" rules act on.
 *
 * Responsibility: the closed vocabulary Gemini tags clauses with and the offline
 * analyser detects with keywords. Boundary: this file names things; deciding
 * what a signal means legally is the job of knowledge/red-flag-rules.ts.
 */

/** What a clause is about. Drives icons, grouping and offline classification. */
export const CLAUSE_CATEGORIES = [
  'parties',
  'payment',
  'deposit',
  'term',
  'termination',
  'notice',
  'renewal',
  'penalty',
  'interest',
  'fees',
  'maintenance',
  'liability',
  'indemnity',
  'confidentiality',
  'non-compete',
  'intellectual-property',
  'data-privacy',
  'coverage',
  'exclusion',
  'dispute-resolution',
  'governing-law',
  'other',
] as const;

export type ClauseCategory = (typeof CLAUSE_CATEGORIES)[number];

/** How much a clause should worry the reader, from their own role's point of view. */
export const RISK_LEVELS = ['high', 'medium', 'low'] as const;

export type RiskLevel = (typeof RISK_LEVELS)[number];

/** Who a clause tilts towards, from the reader's point of view. */
export const FAVOURS = ['you', 'other-party', 'balanced'] as const;

export type Favours = (typeof FAVOURS)[number];

/**
 * Specific, checkable patterns inside a clause. Gemini tags them; red-flag rules
 * turn them into law-anchored warnings. Keeping the list closed means the model
 * can only report patterns our rules know how to explain.
 */
export const CLAUSE_SIGNALS = [
  'one-sided-termination',
  'sole-discretion',
  'refund-at-discretion',
  'entry-without-notice',
  'tenant-structural-repairs',
  'full-rent-for-lock-in',
  'unilateral-changes',
  'auto-renewal',
  'post-employment-non-compete',
  'training-bond',
  'one-sided-arbitrator',
  'waiver-of-legal-remedies',
  'unlimited-liability',
  'broad-indemnity',
  'data-sharing-third-parties',
  'penal-interest-compounding',
  'foreclosure-charges',
  'no-refund',
  'blanket-exclusion',
] as const;

export type ClauseSignal = (typeof CLAUSE_SIGNALS)[number];

/** Reader-facing labels for categories. */
export const CATEGORY_LABELS: Readonly<Record<ClauseCategory, string>> = {
  parties: 'Parties',
  payment: 'Payment',
  deposit: 'Deposit',
  term: 'Duration',
  termination: 'Ending the agreement',
  notice: 'Notice',
  renewal: 'Renewal',
  penalty: 'Penalty',
  interest: 'Interest',
  fees: 'Fees & charges',
  maintenance: 'Maintenance & repairs',
  liability: 'Liability',
  indemnity: 'Indemnity',
  confidentiality: 'Confidentiality',
  'non-compete': 'Non-compete',
  'intellectual-property': 'Intellectual property',
  'data-privacy': 'Your data',
  coverage: 'What is covered',
  exclusion: 'What is not covered',
  'dispute-resolution': 'Disputes',
  'governing-law': 'Governing law',
  other: 'Other terms',
};

/** Numeric weight used when ranking and scoring, so `high` always sorts first. */
export const RISK_WEIGHT: Readonly<Record<RiskLevel, number>> = {
  high: 3,
  medium: 2,
  low: 1,
};
