/**
 * Model output contracts — exactly what Gemini is asked to return.
 *
 * Responsibility: lean zod schemas for structured output (no ids, no spans: the
 * pipeline adds those after verification) and their conversion to the JSON Schema
 * dialect Gemini accepts. Boundary: the offline analyser returns these same shapes,
 * so every downstream step runs identically in both modes.
 */
import { z } from 'zod';
import { CLAUSE_CATEGORIES, CLAUSE_SIGNALS, FAVOURS, RISK_LEVELS } from '../domain/clauses.js';
import { DOCUMENT_KINDS } from '../domain/document-kinds.js';
import { documentFactsSchema } from '../schemas/facts.js';
import { MAX_CLAUSES, MAX_NEGOTIATION_ASKS, MAX_NEGOTIATION_MESSAGE_CHARS } from '../schemas/limits.js';

const text = (max: number) => z.string().trim().min(1).max(max);
const lines = (max: number, maxItems: number) => z.array(text(max)).max(maxItems);

/**
 * Non-strict objects on purpose: an extra key from the model is dropped rather than
 * failing the whole analysis (strictness is enforced later by analysisSchema).
 */
export const modelClauseSchema = z.object({
  heading: text(120),
  quote: text(1_200),
  plainMeaning: text(600),
  category: z.enum(CLAUSE_CATEGORIES),
  risk: z.enum(RISK_LEVELS),
  favours: z.enum(FAVOURS),
  signals: z.array(z.enum(CLAUSE_SIGNALS)).max(6),
});

export type ModelClause = z.infer<typeof modelClauseSchema>;

export const modelKeyDateSchema = z.object({
  label: text(140),
  isoDate: z.iso.date().optional(),
  text: text(160),
});

export type ModelKeyDate = z.infer<typeof modelKeyDateSchema>;

export const analysisModelOutputSchema = z.object({
  kind: z.enum(DOCUMENT_KINDS),
  title: text(140),
  summary: z.object({ oneLine: text(600), keyPoints: lines(600, 6) }),
  clauses: z.array(modelClauseSchema).max(MAX_CLAUSES),
  facts: documentFactsSchema,
  keyDates: z.array(modelKeyDateSchema).max(20),
  obligations: z.object({ yours: lines(600, 12), theirs: lines(600, 12) }),
  inconsistencies: lines(600, 20),
  checklist: lines(600, 10),
  lawyerQuestions: lines(600, 10),
});

export type AnalysisModelOutput = z.infer<typeof analysisModelOutputSchema>;

export const askModelOutputSchema = z.object({
  answer: text(4_000),
  citedQuotes: lines(1_200, 5),
  answerType: z.enum(['answered', 'not-in-document', 'needs-lawyer']),
  followUps: lines(200, 4),
});

export type AskModelOutput = z.infer<typeof askModelOutputSchema>;

export const compareModelOutputSchema = z.object({
  summary: text(600),
  verdict: text(600),
  changes: z
    .array(
      z.object({
        topic: text(140),
        first: text(600).optional(),
        second: text(600).optional(),
        change: z.enum(['added', 'removed', 'changed']),
        favours: z.enum(['first', 'second', 'neutral']),
        note: text(600),
      }),
    )
    .max(25),
});

export type CompareModelOutput = z.infer<typeof compareModelOutputSchema>;

/** A drafted change request; `current` is matched back to a clause quote before it is shown. */
export const negotiationModelOutputSchema = z.object({
  subject: text(160).optional(),
  message: text(MAX_NEGOTIATION_MESSAGE_CHARS),
  asks: z
    .array(
      z.object({
        heading: text(120),
        current: text(1_200),
        proposed: text(1_200),
        reason: text(600),
      }),
    )
    .max(MAX_NEGOTIATION_ASKS),
});

export type NegotiationModelOutput = z.infer<typeof negotiationModelOutputSchema>;

/** Keys Gemini's response-schema dialect rejects or ignores. */
const GEMINI_UNSUPPORTED_KEYS: ReadonlySet<string> = new Set(['$schema', 'additionalProperties']);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stripUnsupported(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripUnsupported);
  if (!isRecord(value)) return value;
  const cleaned: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value)) {
    if (!GEMINI_UNSUPPORTED_KEYS.has(key)) cleaned[key] = stripUnsupported(child);
  }
  return cleaned;
}

/**
 * Converts a zod schema to the JSON Schema Gemini accepts as `responseJsonSchema`.
 * @example
 * toGeminiSchema(askModelOutputSchema).type; // 'object'
 */
export function toGeminiSchema(schema: z.ZodType): Record<string, unknown> {
  const cleaned = stripUnsupported(z.toJSONSchema(schema));
  return isRecord(cleaned) ? cleaned : {};
}
