/**
 * Fact comparison between two drafts of the same document.
 *
 * Responsibility: line up every numeric fact either draft states and say which draft
 * is better for the reader, flipping direction when the reader holds the stronger role.
 * Boundary: numbers only; wording changes are compared by the model or offline summary.
 */
import type { DocumentKind, UserRole } from '../domain/document-kinds.js';
import type { FactDelta, FactDeltaWinner } from '../schemas/features.js';
import { type DocumentFacts, FACT_DEFINITIONS, isDefaultPerspective, NUMERIC_FACT_KEYS } from '../schemas/facts.js';

function winner(first: number, second: number, betterWhen: 'lower' | 'higher' | 'neutral', flip: boolean): FactDeltaWinner {
  if (first === second) return 'equal';
  if (betterWhen === 'neutral') return 'unknown';
  const lowerWins = (betterWhen === 'lower') !== flip;
  return first < second === lowerWins ? 'first' : 'second';
}

/**
 * Compares the numeric facts of two drafts from the reader's side.
 * @example
 * compareFacts('rental', 'tenant', { securityDepositInr: 100000 }, { securityDepositInr: 50000 })[0]?.betterFor; // 'second'
 */
export function compareFacts(kind: DocumentKind, role: UserRole, first: DocumentFacts, second: DocumentFacts): FactDelta[] {
  const flip = !isDefaultPerspective(kind, role);
  return NUMERIC_FACT_KEYS.flatMap((key): FactDelta[] => {
    const a = first[key];
    const b = second[key];
    if (a === undefined && b === undefined) return [];
    const definition = FACT_DEFINITIONS[key];
    const base = { key, label: definition.label, unit: definition.unit };
    const betterFor = a === undefined || b === undefined ? 'unknown' : winner(a, b, definition.betterWhen, flip);
    return [{ ...base, ...(a === undefined ? {} : { first: a }), ...(b === undefined ? {} : { second: b }), betterFor }];
  });
}
