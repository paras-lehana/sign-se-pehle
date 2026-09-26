/**
 * Kavach score — one number summarising how balanced a document is for the reader.
 *
 * Responsibility: start at 100 and subtract named penalties for red flags and for
 * risky clauses no flag already covers; map the value to a band. Boundary: a reading
 * aid, not a legal opinion — the reasons list says exactly what drove the number.
 */
import type { RiskLevel } from '../domain/clauses.js';
import type { Clause, KavachScore, RedFlag, ScoreBand } from '../schemas/analysis.js';

const MAX_SCORE = 100;
const MIN_SCORE = 0;

/** A high-severity flag (e.g. an unenforceable-looking non-compete) should move a reader from balanced to review on its own. */
export const FLAG_PENALTY: Readonly<Record<RiskLevel, number>> = { high: 20, medium: 10, low: 3 };

/** Risky clauses without a rule behind them count for less: the rating is the model's or keyword table's, not a law check. */
export const CLAUSE_PENALTY: Readonly<Record<RiskLevel, number>> = { high: 8, medium: 4, low: 0 };

/** At or above this, the document reads as broadly balanced for the reader. */
export const BALANCED_MIN = 75;
/** At or above this (and below balanced), it is worth a careful review. */
export const REVIEW_MIN = 45;

/** The score card shows a handful of reasons; the schema allows up to 8. */
const MAX_REASONS = 5;

/**
 * Maps a 0–100 value to its band.
 * @example
 * scoreBand(80); // 'balanced'
 */
export function scoreBand(value: number): ScoreBand {
  if (value >= BALANCED_MIN) return 'balanced';
  if (value >= REVIEW_MIN) return 'review';
  return 'high-risk';
}

/**
 * Computes the Kavach score from red flags and clause risk ratings.
 * @example
 * computeScore([], []); // { value: 100, band: 'balanced', reasons: ['No rule-based red flags were found.'] }
 */
export function computeScore(flags: readonly RedFlag[], clauses: readonly Clause[]): KavachScore {
  const covered = new Set(flags.flatMap((flag) => flag.clauseIds));
  const flagPenalty = flags.reduce((sum, flag) => sum + FLAG_PENALTY[flag.severity], 0);
  const uncovered = clauses.filter((clause) => !covered.has(clause.id));
  const clausePenalty = uncovered.reduce((sum, clause) => sum + CLAUSE_PENALTY[clause.risk], 0);
  const value = Math.round(Math.min(MAX_SCORE, Math.max(MIN_SCORE, MAX_SCORE - flagPenalty - clausePenalty)));
  const reasons = flags.slice(0, MAX_REASONS).map((flag) => flag.title);
  const riskyUncovered = uncovered.filter((clause) => CLAUSE_PENALTY[clause.risk] > 0).length;
  if (riskyUncovered > 0 && reasons.length < MAX_REASONS) {
    reasons.push(`${riskyUncovered} more clause${riskyUncovered === 1 ? ' was' : 's were'} rated medium or high risk for you.`);
  }
  if (reasons.length === 0) reasons.push('No rule-based red flags were found.');
  return { value, band: scoreBand(value), reasons };
}
