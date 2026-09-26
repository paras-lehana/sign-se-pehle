/**
 * Ask assembly — verifies an answer's citations against the document.
 *
 * Responsibility: keep only cited quotes that really appear in the document (with
 * spans), and refuse to present an "answered" reply that has no verified support.
 * Boundary: identical for Gemini and offline answers.
 */
import { locateQuote } from '../engine/quote-verify.js';
import { clipText } from '../format.js';
import type { AskModelOutput } from '../genai/model-output.js';
import type { Provenance } from '../schemas/analysis.js';
import { type AskResponse, askResponseSchema, type Citation, MAX_CITATIONS, MAX_FOLLOW_UPS } from '../schemas/features.js';

export interface AssembleAskInput {
  readonly output: AskModelOutput;
  readonly text: string;
  readonly provenance: Provenance;
}

/** Shown instead of an answer the document could not back up with a verified quote. */
export const UNSUPPORTED_ANSWER_MESSAGE =
  'I could not find text in your document that supports an answer, so I will not guess. Consider asking the other party to confirm this in writing.';

const MAX_QUOTE_CHARS = 1_200;
const MAX_FOLLOW_UP_CHARS = 200;
const MAX_ANSWER_CHARS = 4_000;

function verifiedCitations(quotes: readonly string[], text: string): Citation[] {
  const seen = new Set<string>();
  return quotes.flatMap((quote): Citation[] => {
    const span = locateQuote(text, quote);
    if (span === null) return [];
    const key = `${span.start}:${span.end}`;
    if (seen.has(key)) return [];
    seen.add(key);
    return [{ quote: clipText(text.slice(span.start, span.end), MAX_QUOTE_CHARS), span }];
  }).slice(0, MAX_CITATIONS);
}

/**
 * Builds a verified AskResponse.
 * @example
 * assembleAsk({ output, text, provenance }).answerType; // 'answered' only with a verified quote
 */
export function assembleAsk(input: AssembleAskInput): AskResponse {
  const citations = verifiedCitations(input.output.citedQuotes, input.text);
  const unsupported = input.output.answerType === 'answered' && citations.length === 0;
  return askResponseSchema.parse({
    answer: unsupported ? UNSUPPORTED_ANSWER_MESSAGE : clipText(input.output.answer, MAX_ANSWER_CHARS),
    answerType: unsupported ? 'not-in-document' : input.output.answerType,
    citations,
    followUps: input.output.followUps
      .map((followUp) => clipText(followUp, MAX_FOLLOW_UP_CHARS))
      .filter((followUp) => followUp !== '')
      .slice(0, MAX_FOLLOW_UPS),
    provenance: input.provenance,
  });
}
