/**
 * Feature response schemas — Ask, Compare and What-if.
 *
 * Responsibility: the wire contracts for the follow-up features built on an
 * analysis. Boundary: shapes only; filling them is the job of pipeline/ and engine/.
 */
import { z } from 'zod';
import { SCENARIO_IDS } from '../domain/document-kinds.js';
import { provenanceSchema, textSpanSchema } from './analysis.js';
import { FACT_DEFINITIONS, type NumericFactKey } from './facts.js';
import { MAX_AMOUNT_INR } from './limits.js';

const line = z.string().trim().min(1).max(600);

/** A verified quote from the analysed document that supports an answer. */
export const citationSchema = z.strictObject({
  quote: z.string().trim().min(1).max(1_200),
  span: textSpanSchema,
});

export type Citation = z.infer<typeof citationSchema>;

export const ASK_ANSWER_TYPES = ['answered', 'not-in-document', 'needs-lawyer'] as const;

export type AskAnswerType = (typeof ASK_ANSWER_TYPES)[number];

/** Most answers need one or two quotes; five keeps the panel readable. */
export const MAX_CITATIONS = 5;

/** Follow-up chips shown under an answer. */
export const MAX_FOLLOW_UPS = 4;

export const askResponseSchema = z.strictObject({
  answer: z.string().trim().min(1).max(4_000),
  answerType: z.enum(ASK_ANSWER_TYPES),
  citations: z.array(citationSchema).max(MAX_CITATIONS),
  followUps: z.array(z.string().trim().min(1).max(200)).max(MAX_FOLLOW_UPS),
  provenance: provenanceSchema,
});

export type AskResponse = z.infer<typeof askResponseSchema>;

export const COMPARE_CHANGE_TYPES = ['added', 'removed', 'changed'] as const;

export const COMPARE_FAVOURS = ['first', 'second', 'neutral'] as const;

export const compareChangeSchema = z.strictObject({
  topic: z.string().trim().min(1).max(140),
  first: line.optional(),
  second: line.optional(),
  change: z.enum(COMPARE_CHANGE_TYPES),
  favours: z.enum(COMPARE_FAVOURS),
  note: line,
});

export type CompareChange = z.infer<typeof compareChangeSchema>;

export const FACT_DELTA_WINNERS = ['first', 'second', 'equal', 'unknown'] as const;

export type FactDeltaWinner = (typeof FACT_DELTA_WINNERS)[number];

/**
 * Type guard for numeric fact keys, so a delta's key stays tied to FACT_DEFINITIONS.
 * @example
 * isNumericFactKey('monthlyRentInr'); // true
 */
export function isNumericFactKey(value: unknown): value is NumericFactKey {
  return typeof value === 'string' && Object.hasOwn(FACT_DEFINITIONS, value);
}

/** One numeric fact side by side across two drafts, judged from the reader's role. */
export const factDeltaSchema = z.strictObject({
  key: z.custom<NumericFactKey>(isNumericFactKey, { error: 'Unknown fact.' }),
  label: z.string().min(1).max(80),
  unit: z.enum(['inr', 'months', 'days', 'percent']),
  first: z.number().min(0).max(MAX_AMOUNT_INR).optional(),
  second: z.number().min(0).max(MAX_AMOUNT_INR).optional(),
  betterFor: z.enum(FACT_DELTA_WINNERS),
});

export type FactDelta = z.infer<typeof factDeltaSchema>;

/** Compare output stays scannable on a phone. */
export const MAX_COMPARE_CHANGES = 25;

export const compareResponseSchema = z.strictObject({
  summary: line,
  verdict: line,
  changes: z.array(compareChangeSchema).max(MAX_COMPARE_CHANGES),
  factDeltas: z.array(factDeltaSchema).max(Object.keys(FACT_DEFINITIONS).length),
  provenance: provenanceSchema,
});

export type CompareResponse = z.infer<typeof compareResponseSchema>;

export const scenarioLineSchema = z.strictObject({
  label: z.string().trim().min(1).max(140),
  amountInr: z.number().min(0).max(MAX_AMOUNT_INR),
  note: z.string().trim().min(1).max(300),
});

export type ScenarioLine = z.infer<typeof scenarioLineSchema>;

/** A what-if result never needs more than a handful of lines to stay readable. */
export const MAX_SCENARIO_LINES = 8;

export const scenarioResultSchema = z.strictObject({
  scenarioId: z.enum(SCENARIO_IDS),
  title: z.string().trim().min(1).max(140),
  lines: z.array(scenarioLineSchema).max(MAX_SCENARIO_LINES),
  totalInr: z.number().min(0),
  assumptions: z.array(z.string().trim().min(1).max(300)).max(6),
});

export type ScenarioResult = z.infer<typeof scenarioResultSchema>;
