/**
 * Red-flag rule contract and the small helpers every rule shares.
 *
 * Responsibility: define what a rule sees (RuleContext) and returns (RuleHit), plus
 * clause lookups by signal or category. Boundary: rules are pure data + predicates;
 * ordering, law attachment and perspective filtering happen in engine/red-flags.ts.
 */
import type { ClauseCategory, ClauseSignal, RiskLevel } from '../domain/clauses.js';
import type { DocumentKind, UserRole } from '../domain/document-kinds.js';
import type { Clause } from '../schemas/analysis.js';
import type { DocumentFacts } from '../schemas/facts.js';
import type { LawId } from './laws.js';

/** Everything a rule may look at: the document's kind, the reader's role, facts and clauses. */
export interface RuleContext {
  readonly kind: DocumentKind;
  readonly role: UserRole;
  readonly facts: DocumentFacts;
  readonly clauses: readonly Clause[];
}

/** What a firing rule reports; the engine adds severity, rule id and the law reference. */
export interface RuleHit {
  readonly title: string;
  readonly detail: string;
  readonly suggestion: string;
  readonly clauseIds: string[];
}

export interface RedFlagRule {
  readonly id: string;
  /** Kinds the rule applies to, from the default (weaker) role's side; 'all' applies to every reader. */
  readonly kinds: readonly DocumentKind[] | 'all';
  readonly severity: RiskLevel;
  readonly lawId?: LawId;
  test(ctx: RuleContext): RuleHit | null;
}

/**
 * Ids of clauses tagged with any of the given signals.
 * @example
 * clauseIdsWithSignal(ctx, 'auto-renewal'); // ['c4']
 */
export function clauseIdsWithSignal(ctx: RuleContext, ...signals: readonly ClauseSignal[]): string[] {
  return ctx.clauses
    .filter((clause) => clause.signals.some((signal) => signals.includes(signal)))
    .map((clause) => clause.id);
}

/**
 * Ids of clauses in any of the given categories — used to point a fact-based flag at its clause.
 * @example
 * clauseIdsInCategory(ctx, 'deposit'); // ['c3']
 */
export function clauseIdsInCategory(ctx: RuleContext, ...categories: readonly ClauseCategory[]): string[] {
  return ctx.clauses.filter((clause) => categories.includes(clause.category)).map((clause) => clause.id);
}

/**
 * Builds a hit for a signal-only rule, or null when no clause carries the signal.
 * @example
 * signalHit(ctx, ['auto-renewal'], { title, detail, suggestion });
 */
export function signalHit(
  ctx: RuleContext,
  signals: readonly ClauseSignal[],
  copy: Omit<RuleHit, 'clauseIds'>,
): RuleHit | null {
  const clauseIds = clauseIdsWithSignal(ctx, ...signals);
  return clauseIds.length === 0 ? null : { ...copy, clauseIds };
}
