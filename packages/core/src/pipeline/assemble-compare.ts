/**
 * Compare assembly — joins the model's wording comparison with deterministic fact deltas.
 *
 * Responsibility: clip model text to schema bounds and attach the numeric fact deltas
 * computed by engine/compare-facts.ts. Boundary: parses through compareResponseSchema so
 * the wire shape is guaranteed.
 */
import { clipText } from '../format.js';
import type { CompareModelOutput } from '../genai/model-output.js';
import type { Provenance } from '../schemas/analysis.js';
import { type CompareResponse, compareResponseSchema, type FactDelta, MAX_COMPARE_CHANGES } from '../schemas/features.js';

export interface AssembleCompareInput {
  readonly output: CompareModelOutput;
  readonly factDeltas: readonly FactDelta[];
  readonly provenance: Provenance;
}

const MAX_LINE_CHARS = 600;
const MAX_TOPIC_CHARS = 140;

/**
 * Builds a CompareResponse.
 * @example
 * assembleCompare({ output, factDeltas: compareFacts('rental', 'tenant', a, b), provenance });
 */
export function assembleCompare(input: AssembleCompareInput): CompareResponse {
  return compareResponseSchema.parse({
    summary: clipText(input.output.summary, MAX_LINE_CHARS),
    verdict: clipText(input.output.verdict, MAX_LINE_CHARS),
    changes: input.output.changes.slice(0, MAX_COMPARE_CHANGES).map((change) => ({
      topic: clipText(change.topic, MAX_TOPIC_CHARS),
      change: change.change,
      favours: change.favours,
      note: clipText(change.note, MAX_LINE_CHARS),
      ...(change.first === undefined ? {} : { first: clipText(change.first, MAX_LINE_CHARS) }),
      ...(change.second === undefined ? {} : { second: clipText(change.second, MAX_LINE_CHARS) }),
    })),
    factDeltas: [...input.factDeltas],
    provenance: input.provenance,
  });
}
