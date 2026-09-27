/**
 * Negotiation service — POST /api/negotiate.
 *
 * Responsibility: draft fairer wording for the risky clauses plus a ready WhatsApp or email
 * message with one Gemini call, falling back to the deterministic offline drafter.
 * Boundary: matching asks to clauses and attaching curated law references happen in core;
 * this file only redacts, orchestrates the call and records provenance.
 */
import {
  type NegotiateRequest,
  type NegotiateResponse,
  type Result,
  assembleNegotiation,
  buildNegotiationPrompt,
  negotiateOffline,
  negotiationModelOutputSchema,
  ok,
  redactPii,
} from '@sign-se-pehle/core';
import { type ServiceDeps, createNonce } from './analysis-service.js';
import { toModelResponseSchema } from './model-schema.js';
import { createProvenanceTracker } from './provenance.js';

/** Up to eight asks with wording and reasons plus a message: 4k tokens bounds cost and latency. */
const NEGOTIATE_MAX_OUTPUT_TOKENS = 4_096;

const NEGOTIATION_JSON_SCHEMA = toModelResponseSchema(negotiationModelOutputSchema);

export interface NegotiationService {
  negotiate(req: NegotiateRequest): Promise<Result<NegotiateResponse>>;
}

/** The API is public, so clause and flag text may not come from our own redacted analysis. */
function redactRequest(req: NegotiateRequest): NegotiateRequest {
  return {
    ...req,
    clauses: req.clauses.map((clause) => ({ ...clause, heading: redactPii(clause.heading).text, quote: redactPii(clause.quote).text })),
    flags: req.flags.map((flag) => ({ ...flag, title: redactPii(flag.title).text, suggestion: redactPii(flag.suggestion).text })),
  };
}

/**
 * Creates the negotiation service.
 * @example
 * const negotiation = createNegotiationService({ genai, now: Date.now, logger });
 */
export function createNegotiationService(deps: ServiceDeps): NegotiationService {
  const { genai, now, logger } = deps;

  return {
    async negotiate(req) {
      const tracker = createProvenanceTracker(now);
      const redactStartedAt = now();
      const request = redactRequest(req);
      tracker.rules('redact', redactStartedAt);
      const assemble = { clauses: request.clauses, flags: request.flags };

      if (genai.configured) {
        const prompt = buildNegotiationPrompt({ ...request, nonce: createNonce() });
        const result = await genai.generateJson({
          system: prompt.systemInstruction,
          prompt: prompt.prompt,
          schema: negotiationModelOutputSchema,
          jsonSchema: NEGOTIATION_JSON_SCHEMA,
          maxOutputTokens: NEGOTIATE_MAX_OUTPUT_TOKENS,
        });
        if (result.ok) {
          tracker.model('negotiate', result.value.model, result.value.ms);
          return ok(assembleNegotiation({ ...assemble, output: result.value.value, provenance: tracker.build('gemini') }));
        }
        logger.log('WARNING', 'negotiation fell back to offline', { hint: result.error.internalHint ?? '' });
      }
      const startedAt = now();
      const output = negotiateOffline(request);
      tracker.rules('negotiate-offline', startedAt);
      return ok(assembleNegotiation({ ...assemble, output, provenance: tracker.build('offline') }));
    },
  };
}
