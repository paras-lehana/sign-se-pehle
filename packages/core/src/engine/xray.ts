/**
 * Document X-ray — splits the analysed text into plain and clause-highlighted segments.
 *
 * Responsibility: turn verified clause spans into ordered, non-overlapping segments that
 * cover the whole text exactly once, so the web can paint risk over the original document.
 * Boundary: only verified quotes (with a span) are highlighted; unverified ones never are.
 */
import { RISK_WEIGHT, type RiskLevel } from '../domain/clauses.js';
import type { Clause } from '../schemas/analysis.js';

export interface XraySegment {
  readonly start: number;
  readonly end: number;
  readonly text: string;
  /** Present when the segment lies inside a verified clause quote. */
  readonly clauseId?: string;
  readonly risk?: RiskLevel;
}

interface Highlight {
  readonly start: number;
  readonly end: number;
  readonly clauseId: string;
  readonly risk: RiskLevel;
  /** Position in the clause list, to break ties between equally risky overlaps. */
  readonly order: number;
}

function highlightsFor(text: string, clauses: readonly Clause[]): Highlight[] {
  return clauses.flatMap((clause, order): Highlight[] => {
    if (!clause.quoteVerified || clause.span === undefined) return [];
    const start = Math.max(0, Math.min(clause.span.start, text.length));
    const end = Math.max(start, Math.min(clause.span.end, text.length));
    return end > start ? [{ start, end, clauseId: clause.id, risk: clause.risk, order }] : [];
  });
}

function outranks(candidate: Highlight, current: Highlight | undefined): boolean {
  if (current === undefined) return true;
  const difference = RISK_WEIGHT[candidate.risk] - RISK_WEIGHT[current.risk];
  return difference > 0 || (difference === 0 && candidate.order < current.order);
}

/** The highlight shown from `at` to the next cut: the riskiest one covering it, earliest clause on ties. */
function winnerAt(highlights: readonly Highlight[], at: number): Highlight | undefined {
  let best: Highlight | undefined;
  for (const highlight of highlights) {
    if (highlight.start <= at && at < highlight.end && outranks(highlight, best)) best = highlight;
  }
  return best;
}

/**
 * Segments `text` by the clauses' verified spans. Where spans overlap, the higher-risk clause
 * keeps the overlapping stretch; gaps become plain segments; empty text gives no segments.
 * @example
 * segmentByClauses('Rent is due. Deposit is 2 months.', [{ ...clause, span: { start: 13, end: 33 } }]);
 * // [{ start: 0, end: 13, text: 'Rent is due. ' }, { start: 13, end: 33, text: 'Deposit is 2 months.', clauseId: 'c1', risk: 'low' }]
 */
export function segmentByClauses(text: string, clauses: readonly Clause[]): XraySegment[] {
  const highlights = highlightsFor(text, clauses);
  const cuts = [...new Set([0, text.length, ...highlights.flatMap((highlight) => [highlight.start, highlight.end])])].sort((a, b) => a - b);
  const segments: XraySegment[] = [];
  cuts.forEach((start, index) => {
    const end = cuts[index + 1];
    if (end === undefined || end <= start) return;
    const winner = winnerAt(highlights, start);
    const previous = segments.at(-1);
    if (previous !== undefined && previous.clauseId === winner?.clauseId) {
      segments[segments.length - 1] = { ...previous, end, text: text.slice(previous.start, end) };
      return;
    }
    const base = { start, end, text: text.slice(start, end) };
    segments.push(winner === undefined ? base : { ...base, clauseId: winner.clauseId, risk: winner.risk });
  });
  return segments;
}
