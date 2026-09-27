/**
 * Negotiation assembly — keeps only change requests that point at a real clause.
 *
 * Responsibility: drop any ask whose "current" wording is not found in one of the clause
 * quotes (normalised), attach that clause's id, add law references from the curated red flags
 * and parse through negotiateResponseSchema. Boundary: identical for Gemini and offline drafts;
 * the model never supplies law references.
 */
import { normalizeQuote } from '../engine/quote-verify.js';
import { clipText } from '../format.js';
import type { NegotiationModelOutput } from '../genai/model-output.js';
import { LAW_IDS, type LawId, LAWS } from '../knowledge/laws.js';
import type { Clause, LawReference, Provenance, RedFlag } from '../schemas/analysis.js';
import { type NegotiateAsk, type NegotiateResponse, negotiateResponseSchema } from '../schemas/features.js';
import { MAX_CLAUSES, MAX_NEGOTIATION_ASKS, MAX_NEGOTIATION_MESSAGE_CHARS } from '../schemas/limits.js';

export interface AssembleNegotiationInput {
  readonly output: NegotiationModelOutput;
  readonly clauses: readonly Clause[];
  readonly flags: readonly RedFlag[];
  readonly provenance: Provenance;
}

/** A word or two appears in many clauses and proves nothing, so shorter "current" text is dropped. */
export const MIN_CURRENT_CHARS = 12;

const MAX_HEADING_CHARS = 120;
const MAX_WORDING_CHARS = 1_200;
const MAX_REASON_CHARS = 600;
const MAX_SUBJECT_CHARS = 160;

interface NormalizedClause {
  readonly id: string;
  readonly quote: string;
}

function matchedAsks(output: NegotiationModelOutput, clauses: readonly NormalizedClause[]): NegotiateAsk[] {
  return output.asks
    .flatMap((ask): NegotiateAsk[] => {
      const needle = normalizeQuote(ask.current);
      if (needle.length < MIN_CURRENT_CHARS) return [];
      const clause = clauses.find((candidate) => candidate.quote.includes(needle));
      if (clause === undefined) return [];
      return [
        {
          clauseId: clause.id,
          heading: clipText(ask.heading, MAX_HEADING_CHARS),
          current: clipText(ask.current, MAX_WORDING_CHARS),
          proposed: clipText(ask.proposed, MAX_WORDING_CHARS),
          reason: clipText(ask.reason, MAX_REASON_CHARS),
        },
      ];
    })
    .slice(0, MAX_NEGOTIATION_ASKS);
}

/**
 * Each flag's law once, in flag order (flags arrive most severe first). The reference is looked
 * up in the curated table by id, so a caller cannot put its own "law" into the response.
 */
function uniqueLaws(flags: readonly RedFlag[]): LawReference[] {
  const seen = new Set<LawId>();
  return flags
    .flatMap((flag): LawReference[] => {
      const id = LAW_IDS.find((lawId) => lawId === flag.law?.id);
      if (id === undefined || seen.has(id)) return [];
      seen.add(id);
      return [LAWS[id]];
    })
    .slice(0, MAX_CLAUSES);
}

/**
 * Builds a verified NegotiateResponse.
 * @example
 * assembleNegotiation({ output: negotiateOffline(request), clauses: request.clauses, flags: request.flags, provenance });
 */
export function assembleNegotiation(input: AssembleNegotiationInput): NegotiateResponse {
  const clauses = input.clauses.map((clause): NormalizedClause => ({ id: clause.id, quote: normalizeQuote(clause.quote) }));
  const subject = input.output.subject === undefined ? {} : { subject: clipText(input.output.subject, MAX_SUBJECT_CHARS) };
  return negotiateResponseSchema.parse({
    ...subject,
    message: clipText(input.output.message, MAX_NEGOTIATION_MESSAGE_CHARS),
    asks: matchedAsks(input.output, clauses),
    references: uniqueLaws(input.flags),
    provenance: input.provenance,
  });
}
