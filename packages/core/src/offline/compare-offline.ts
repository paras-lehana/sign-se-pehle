/**
 * Offline comparison of two drafts.
 *
 * Responsibility: produce the same CompareModelOutput shape as the model from the
 * deterministic fact deltas, so Compare still works without an API key. Boundary:
 * numbers only — wording changes need the model.
 */
import { formatFactValue } from '../format.js';
import type { CompareModelOutput } from '../genai/model-output.js';
import type { FactDelta } from '../schemas/features.js';

function describe(delta: FactDelta, side: 'first' | 'second'): string | undefined {
  const value = delta[side];
  return value === undefined ? undefined : formatFactValue(value, delta.unit);
}

/**
 * Summarises fact deltas as a model-shaped comparison.
 * @example
 * compareOffline([]).changes.length; // 0
 */
export function compareOffline(factDeltas: readonly FactDelta[]): CompareModelOutput {
  const differing = factDeltas.filter((delta) => delta.betterFor !== 'equal');
  const firstWins = differing.filter((delta) => delta.betterFor === 'first').length;
  const secondWins = differing.filter((delta) => delta.betterFor === 'second').length;
  const verdict =
    firstWins === secondWins
      ? 'On the numbers found, neither draft is clearly more balanced for you.'
      : `On the numbers found, the ${firstWins > secondWins ? 'first' : 'second'} draft looks more balanced for you (${Math.max(firstWins, secondWins)} of ${differing.length} differences).`;
  return {
    summary: `Offline comparison of ${factDeltas.length} stated numbers; ${differing.length} differ. Wording changes need the Gemini engine.`,
    verdict,
    changes: differing.map((delta) => {
      const first = describe(delta, 'first');
      const second = describe(delta, 'second');
      return {
        topic: delta.label,
        change: first === undefined ? 'added' : second === undefined ? 'removed' : 'changed',
        favours: delta.betterFor === 'first' || delta.betterFor === 'second' ? delta.betterFor : 'neutral',
        note: `${first ?? 'Not stated'} in the first draft, ${second ?? 'not stated'} in the second.`,
        ...(first === undefined ? {} : { first }),
        ...(second === undefined ? {} : { second }),
      };
    }),
  };
}
