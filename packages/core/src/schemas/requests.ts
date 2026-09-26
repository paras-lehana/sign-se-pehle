/**
 * Request schemas — the only shapes the API accepts.
 *
 * Responsibility: validate every inbound payload identically in the web forms and
 * the server. All objects are strict (unknown keys are rejected) and every string
 * is length-bounded, which also bounds prompt-injection payloads.
 */
import { z } from 'zod';
import { DOCUMENT_KINDS, SCENARIO_IDS, USER_ROLES } from '../domain/document-kinds.js';
import { LANGUAGE_CODES } from '../domain/languages.js';
import { clauseSchema, redFlagSchema } from './analysis.js';
import { documentFactsSchema } from './facts.js';
import {
  ALLOWED_UPLOAD_MIME_TYPES,
  MAX_AMOUNT_INR,
  MAX_CHAT_HISTORY_TURNS,
  MAX_CLAUSES,
  MAX_DOCUMENT_CHARS,
  MAX_MONTHS,
  MAX_QUESTION_CHARS,
  MAX_SITUATION_CHARS,
  MAX_SPEECH_CHARS,
  MAX_TERM_CHARS,
  MAX_UPLOAD_BASE64_CHARS,
  MIN_DOCUMENT_CHARS,
} from './limits.js';

const language = z.enum(LANGUAGE_CODES);
const role = z.enum(USER_ROLES);

/** Pasted document text. */
export const documentTextSchema = z
  .string()
  .trim()
  .min(MIN_DOCUMENT_CHARS, { error: `Please paste at least ${MIN_DOCUMENT_CHARS} characters.` })
  .max(MAX_DOCUMENT_CHARS, { error: `Please keep the text under ${MAX_DOCUMENT_CHARS} characters.` });

const BASE64_PATTERN = /^[A-Za-z0-9+/]+={0,2}$/;

/** A document is either pasted text or an uploaded PDF / photo. */
export const documentInputSchema = z.discriminatedUnion('type', [
  z.strictObject({ type: z.literal('text'), text: documentTextSchema }),
  z.strictObject({
    type: z.literal('file'),
    mimeType: z.enum(ALLOWED_UPLOAD_MIME_TYPES),
    fileName: z.string().trim().min(1).max(120),
    dataBase64: z.string().min(4).max(MAX_UPLOAD_BASE64_CHARS).regex(BASE64_PATTERN),
  }),
]);

export type DocumentInput = z.infer<typeof documentInputSchema>;

export const analyzeRequestSchema = z.strictObject({
  document: documentInputSchema,
  language,
  role: role.optional(),
  kindHint: z.enum(DOCUMENT_KINDS).optional(),
});

export type AnalyzeRequest = z.infer<typeof analyzeRequestSchema>;

export const chatTurnSchema = z.strictObject({
  question: z.string().trim().min(1).max(MAX_QUESTION_CHARS),
  answer: z.string().trim().min(1).max(4_000),
});

export const askRequestSchema = z.strictObject({
  documentText: documentTextSchema,
  kind: z.enum(DOCUMENT_KINDS),
  role,
  language,
  question: z.string().trim().min(2).max(MAX_QUESTION_CHARS),
  history: z.array(chatTurnSchema).max(MAX_CHAT_HISTORY_TURNS).default([]),
});

export type AskRequest = z.infer<typeof askRequestSchema>;

export const compareRequestSchema = z.strictObject({
  first: documentTextSchema,
  second: documentTextSchema,
  language,
  role: role.optional(),
  kindHint: z.enum(DOCUMENT_KINDS).optional(),
});

export type CompareRequest = z.infer<typeof compareRequestSchema>;

/** Inputs a what-if scenario may ask the reader for. All optional; each scenario reads its own. */
export const scenarioInputsSchema = z.strictObject({
  monthsCompleted: z.number().finite().min(0).max(MAX_MONTHS).optional(),
  daysLate: z.number().int().min(0).max(365).optional(),
  prepayAmountInr: z.number().finite().min(0).max(MAX_AMOUNT_INR).optional(),
  noticeServedDays: z.number().int().min(0).max(365).optional(),
});

export type ScenarioInputs = z.infer<typeof scenarioInputsSchema>;

export const simulateRequestSchema = z.strictObject({
  scenarioId: z.enum(SCENARIO_IDS),
  facts: documentFactsSchema,
  inputs: scenarioInputsSchema,
});

export type SimulateRequest = z.infer<typeof simulateRequestSchema>;

export const NEGOTIATION_TONES = ['polite', 'firm'] as const;
export const NEGOTIATION_CHANNELS = ['email', 'whatsapp'] as const;

export const negotiateRequestSchema = z.strictObject({
  kind: z.enum(DOCUMENT_KINDS),
  role,
  language,
  tone: z.enum(NEGOTIATION_TONES),
  channel: z.enum(NEGOTIATION_CHANNELS),
  clauses: z.array(clauseSchema).min(1).max(MAX_CLAUSES),
  flags: z.array(redFlagSchema).max(MAX_CLAUSES),
});

export type NegotiateRequest = z.infer<typeof negotiateRequestSchema>;

export const briefRequestSchema = z.strictObject({
  kind: z.enum(DOCUMENT_KINDS),
  role,
  language,
  situation: z.string().trim().min(10).max(MAX_SITUATION_CHARS),
  documentSummary: z.string().trim().min(1).max(1_200),
  flags: z.array(redFlagSchema).max(MAX_CLAUSES),
});

export type BriefRequest = z.infer<typeof briefRequestSchema>;

/**
 * Free legal aid screening answers. Mirrors the categories in section 12 of the
 * Legal Services Authorities Act, 1987 (see knowledge/legal-aid.ts).
 */
export const eligibilityRequestSchema = z.strictObject({
  isWoman: z.boolean(),
  isChild: z.boolean(),
  isScheduledCasteOrTribe: z.boolean(),
  hasDisability: z.boolean(),
  isIndustrialWorkman: z.boolean(),
  isInCustody: z.boolean(),
  isVictimOfTraffickingOrBegar: z.boolean(),
  isVictimOfDisasterOrViolence: z.boolean(),
  annualIncomeInr: z.number().finite().min(0).max(MAX_AMOUNT_INR).optional(),
});

export type EligibilityRequest = z.infer<typeof eligibilityRequestSchema>;

export const speechRequestSchema = z.strictObject({
  text: z.string().trim().min(1).max(MAX_SPEECH_CHARS),
  language,
});

export type SpeechRequest = z.infer<typeof speechRequestSchema>;

export const glossaryRequestSchema = z.strictObject({
  term: z
    .string()
    .trim()
    .min(2)
    .max(MAX_TERM_CHARS)
    .regex(/^[\p{L}\p{M}\s'.-]+$/u, { error: 'Please enter a word or short phrase.' }),
  language,
});

export type GlossaryRequest = z.infer<typeof glossaryRequestSchema>;

/** Bounds re-exported for forms that show "x / max" counters. */
export const FORM_LIMITS = {
  question: MAX_QUESTION_CHARS,
  situation: MAX_SITUATION_CHARS,
  document: MAX_DOCUMENT_CHARS,
  clauses: MAX_CLAUSES,
} as const;
