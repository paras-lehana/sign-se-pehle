/**
 * Analysis — the report returned for one document.
 *
 * Responsibility: the wire contract between server and web for an analysed
 * document. Boundary: shapes only; the pipeline that fills them lives in the
 * server (Gemini path) and in offline/ (deterministic path).
 */
import { z } from 'zod';
import { CLAUSE_CATEGORIES, CLAUSE_SIGNALS, FAVOURS, RISK_LEVELS } from '../domain/clauses.js';
import { DOCUMENT_KINDS, USER_ROLES } from '../domain/document-kinds.js';
import { LANGUAGE_CODES } from '../domain/languages.js';
import { documentFactsSchema } from './facts.js';
import { MAX_AMOUNT_INR, MAX_CLAUSES, MAX_DOCUMENT_CHARS, MAX_ID_CHARS } from './limits.js';

const idSchema = z.string().trim().min(1).max(MAX_ID_CHARS);
const line = z.string().trim().min(1).max(600);
const lines = (max: number) => z.array(line).max(max);

/** A statute or regulation a warning is anchored to — always from the curated knowledge base. */
export const lawReferenceSchema = z.strictObject({
  id: idSchema,
  act: z.string().min(1).max(160),
  section: z.string().min(1).max(80),
  summary: z.string().min(1).max(400),
  url: z.url(),
});

export type LawReference = z.infer<typeof lawReferenceSchema>;

/** Character offsets of a verified quote inside the analysed text (for highlighting). */
export const textSpanSchema = z.strictObject({
  start: z.number().int().min(0).max(MAX_DOCUMENT_CHARS),
  end: z.number().int().min(0).max(MAX_DOCUMENT_CHARS),
});

export type TextSpan = z.infer<typeof textSpanSchema>;

export const clauseSchema = z.strictObject({
  id: idSchema,
  heading: z.string().trim().min(1).max(120),
  /** Verbatim excerpt from the document. */
  quote: z.string().trim().min(1).max(1_200),
  plainMeaning: line,
  category: z.enum(CLAUSE_CATEGORIES),
  risk: z.enum(RISK_LEVELS),
  favours: z.enum(FAVOURS),
  signals: z.array(z.enum(CLAUSE_SIGNALS)).max(6),
  /** True when the quote was found in the source text — unverified quotes are never shown as quotes. */
  quoteVerified: z.boolean(),
  span: textSpanSchema.optional(),
});

export type Clause = z.infer<typeof clauseSchema>;

/** A deterministic, law-anchored warning produced by the rule engine. */
export const redFlagSchema = z.strictObject({
  ruleId: idSchema,
  severity: z.enum(RISK_LEVELS),
  title: z.string().min(1).max(140),
  detail: line,
  suggestion: line,
  law: lawReferenceSchema.optional(),
  clauseIds: z.array(idSchema).max(MAX_CLAUSES),
});

export type RedFlag = z.infer<typeof redFlagSchema>;

export const inconsistencySchema = z.strictObject({
  /** `rule` = found by deterministic checks; `ai` = spotted by Gemini while reading. */
  source: z.enum(['rule', 'ai']),
  description: line,
  clauseIds: z.array(idSchema).max(MAX_CLAUSES),
});

export type Inconsistency = z.infer<typeof inconsistencySchema>;

export const keyDateSchema = z.strictObject({
  label: z.string().trim().min(1).max(140),
  /** ISO date (YYYY-MM-DD) when the document states an exact date. */
  isoDate: z.iso.date().optional(),
  /** The date as written, or a relative description such as "15 days after notice". */
  text: z.string().trim().min(1).max(160),
  clauseId: idSchema.optional(),
});

export type KeyDate = z.infer<typeof keyDateSchema>;

export const moneyItemSchema = z.strictObject({
  label: z.string().min(1).max(140),
  amountInr: z.number().finite().min(0).max(MAX_AMOUNT_INR),
  clauseId: idSchema.optional(),
});

export type MoneyItem = z.infer<typeof moneyItemSchema>;

export const SCORE_BANDS = ['balanced', 'review', 'high-risk'] as const;

export type ScoreBand = (typeof SCORE_BANDS)[number];

export const kavachScoreSchema = z.strictObject({
  /** 0–100; higher means fewer and milder concerns for the reader's role. */
  value: z.number().int().min(0).max(100),
  band: z.enum(SCORE_BANDS),
  reasons: lines(8),
});

export type KavachScore = z.infer<typeof kavachScoreSchema>;

export const REDACTION_TYPES = [
  'aadhaar',
  'pan',
  'phone',
  'email',
  'bank-account',
  'ifsc',
  'upi',
  'card',
] as const;

export type RedactionType = (typeof REDACTION_TYPES)[number];

export const redactionCountSchema = z.strictObject({
  type: z.enum(REDACTION_TYPES),
  count: z.number().int().min(1),
});

export type RedactionCount = z.infer<typeof redactionCountSchema>;

export const ENGINE_MODES = ['gemini', 'offline'] as const;

export type EngineMode = (typeof ENGINE_MODES)[number];

/** Which engine produced a response and how long each step took — shown to readers as provenance. */
export const provenanceSchema = z.strictObject({
  mode: z.enum(ENGINE_MODES),
  models: z.array(z.string().min(1).max(80)).max(6),
  latencyMs: z.number().int().min(0),
  steps: z
    .array(
      z.strictObject({
        name: z.string().min(1).max(80),
        engine: z.string().min(1).max(80),
        ms: z.number().int().min(0),
      }),
    )
    .max(10),
});

export type Provenance = z.infer<typeof provenanceSchema>;

export const DOCUMENT_SOURCES = ['text', 'pdf', 'image'] as const;

export type DocumentSource = (typeof DOCUMENT_SOURCES)[number];

export const analysisSchema = z.strictObject({
  id: idSchema,
  kind: z.enum(DOCUMENT_KINDS),
  role: z.enum(USER_ROLES),
  language: z.enum(LANGUAGE_CODES),
  title: z.string().trim().min(1).max(140),
  summary: z.strictObject({
    oneLine: line,
    keyPoints: lines(6),
  }),
  clauses: z.array(clauseSchema).max(MAX_CLAUSES),
  facts: documentFactsSchema,
  flags: z.array(redFlagSchema).max(MAX_CLAUSES),
  inconsistencies: z.array(inconsistencySchema).max(20),
  keyDates: z.array(keyDateSchema).max(20),
  obligations: z.strictObject({ yours: lines(12), theirs: lines(12) }),
  moneyAtStake: z.strictObject({
    items: z.array(moneyItemSchema).max(12),
    totalInr: z.number().finite().min(0),
  }),
  score: kavachScoreSchema,
  checklist: lines(10),
  lawyerQuestions: lines(10),
  document: z.strictObject({
    /** The PII-redacted text every quote, span and follow-up question refers to. */
    text: z.string().max(MAX_DOCUMENT_CHARS),
    source: z.enum(DOCUMENT_SOURCES),
    redactions: z.array(redactionCountSchema).max(REDACTION_TYPES.length),
  }),
  provenance: provenanceSchema,
});

export type Analysis = z.infer<typeof analysisSchema>;
