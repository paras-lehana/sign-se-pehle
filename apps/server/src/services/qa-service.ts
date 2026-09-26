/**
 * Q&A and comparison services — POST /api/ask and POST /api/compare.
 *
 * Responsibility: answer questions grounded in the document and compare two drafts,
 * with Gemini first and deterministic core fallbacks when it is unavailable.
 * Boundary: citations are verified and fact deltas computed in core; this file only
 * orchestrates the calls and records provenance.
 */
import {
  type AskRequest,
  type CompareRequest,
  type Result,
  analyzeOffline,
  askModelOutputSchema,
  askOffline,
  assembleAsk,
  assembleCompare,
  buildAskPrompt,
  buildComparePrompt,
  compareFacts,
  compareModelOutputSchema,
  compareOffline,
  ok,
  redactPii,
  resolveRole,
} from '@sign-se-pehle/core';
import { type ServiceDeps, createNonce } from './analysis-service.js';
import { toModelResponseSchema } from './model-schema.js';
import { createProvenanceTracker } from './provenance.js';

/** A grounded answer is a few paragraphs; 2k tokens bounds cost and latency. */
const ASK_MAX_OUTPUT_TOKENS = 2_048;

/** A comparison lists up to a few dozen changes. */
const COMPARE_MAX_OUTPUT_TOKENS = 8_192;

const ASK_JSON_SCHEMA = toModelResponseSchema(askModelOutputSchema);
const COMPARE_JSON_SCHEMA = toModelResponseSchema(compareModelOutputSchema);

export type AskResponse = ReturnType<typeof assembleAsk>;
export type CompareResponse = ReturnType<typeof assembleCompare>;

export interface QaService {
  ask(req: AskRequest): Promise<Result<AskResponse>>;
  compare(req: CompareRequest): Promise<Result<CompareResponse>>;
}

/**
 * Creates the ask/compare services.
 * @example
 * const qa = createQaService({ genai, now: Date.now, logger });
 */
export function createQaService(deps: ServiceDeps): QaService {
  const { genai, now, logger } = deps;

  return {
    async ask(req) {
      const tracker = createProvenanceTracker(now);
      // Re-redact: the API is public, so text may not have come from our own analysis.
      const text = redactPii(req.documentText).text;
      if (genai.configured) {
        const prompt = buildAskPrompt({
          text,
          question: req.question,
          history: req.history,
          role: req.role,
          kind: req.kind,
          language: req.language,
          nonce: createNonce(),
        });
        const result = await genai.generateJson({
          system: prompt.systemInstruction,
          prompt: prompt.prompt,
          schema: askModelOutputSchema,
          jsonSchema: ASK_JSON_SCHEMA,
          maxOutputTokens: ASK_MAX_OUTPUT_TOKENS,
        });
        if (result.ok) {
          tracker.model('answer', result.value.model, result.value.ms);
          return ok(assembleAsk({ output: result.value.value, text, provenance: tracker.build('gemini') }));
        }
        logger.log('WARNING', 'ask fell back to offline', { hint: result.error.internalHint ?? '' });
      }
      const startedAt = now();
      // Without clauses, the offline answerer segments the text itself.
      const output = askOffline({ text, question: req.question });
      tracker.rules('answer-offline', startedAt);
      return ok(assembleAsk({ output, text, provenance: tracker.build('offline') }));
    },

    async compare(req) {
      const tracker = createProvenanceTracker(now);
      const factsStartedAt = now();
      const first = redactPii(req.first).text;
      const second = redactPii(req.second).text;
      const kindHint = req.kindHint === undefined ? {} : { kindHint: req.kindHint };
      const offlineFirst = analyzeOffline({ text: first, language: req.language, ...kindHint });
      const offlineSecond = analyzeOffline({ text: second, language: req.language, ...kindHint });
      const kind = req.kindHint ?? offlineFirst.kind;
      const role = resolveRole(kind, req.role);
      const factDeltas = compareFacts(kind, role, offlineFirst.facts, offlineSecond.facts);
      tracker.rules('fact-deltas', factsStartedAt);

      if (genai.configured) {
        const prompt = buildComparePrompt({
          first,
          second,
          role,
          language: req.language,
          nonce: createNonce(),
        });
        const result = await genai.generateJson({
          system: prompt.systemInstruction,
          prompt: prompt.prompt,
          schema: compareModelOutputSchema,
          jsonSchema: COMPARE_JSON_SCHEMA,
          maxOutputTokens: COMPARE_MAX_OUTPUT_TOKENS,
        });
        if (result.ok) {
          tracker.model('compare', result.value.model, result.value.ms);
          return ok(
            assembleCompare({ output: result.value.value, factDeltas, provenance: tracker.build('gemini') }),
          );
        }
        logger.log('WARNING', 'compare fell back to offline', { hint: result.error.internalHint ?? '' });
      }
      const output = compareOffline(factDeltas);
      return ok(assembleCompare({ output, factDeltas, provenance: tracker.build('offline') }));
    },
  };
}
