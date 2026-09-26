/**
 * Analysis service — the document pipeline behind POST /api/analyze.
 *
 * Responsibility: read the document (transcribing PDFs/photos with Gemini), redact
 * PII, serve repeats from cache, explain with Gemini and fall back to the offline
 * analyser, then assemble a verified report. Boundary: all legal logic lives in core;
 * this file only orchestrates I/O, caching and concurrency.
 */
import { createHash, randomBytes } from 'node:crypto';
import {
  type Analysis,
  type AnalyzeRequest,
  type DocumentInput,
  type DocumentSource,
  type Result,
  MAX_DOCUMENT_CHARS,
  MIN_DOCUMENT_CHARS,
  analysisModelOutputSchema,
  analyzeOffline,
  appError,
  assembleAnalysis,
  buildAnalysisPrompt,
  buildTranscriptionPrompt,
  err,
  ok,
  redactPii,
} from '@sign-se-pehle/core';
import type { Logger } from '../logger.js';
import type { GenAiClient } from './genai-client.js';
import { createLruCache } from './lru-cache.js';
import { toModelResponseSchema } from './model-schema.js';
import { type ProvenanceTracker, createProvenanceTracker } from './provenance.js';

/** Recent analyses kept per instance — a demo session rarely has more than a few dozen documents. */
const CACHE_MAX_ENTRIES = 50;

/** 30 minutes: long enough to revisit a report, short enough that redacted text does not linger. */
const CACHE_TTL_MS = 30 * 60 * 1_000;

/** 16 hex characters (64 bits) of SHA-256 — collision-free at this cache size, short in URLs. */
const ANALYSIS_ID_HEX_CHARS = 16;

/** 8 random bytes → 16 hex characters, inside the core nonce pattern /^[a-f0-9]{8,32}$/. */
const NONCE_BYTES = 8;

/** A verbatim transcription of a 25-page document can run to ~30k tokens. */
const TRANSCRIPTION_MAX_OUTPUT_TOKENS = 32_768;

/** Computed once: the JSON Schema Gemini must follow for an analysis. */
const ANALYSIS_JSON_SCHEMA = toModelResponseSchema(analysisModelOutputSchema);

/** Collaborators every service receives. */
export interface ServiceDeps {
  readonly genai: GenAiClient;
  readonly now: () => number;
  readonly logger: Logger;
}

/** A fresh prompt-boundary nonce so pasted text cannot guess the closing delimiter. */
export function createNonce(): string {
  return randomBytes(NONCE_BYTES).toString('hex');
}

interface ReadDocument {
  readonly text: string;
  readonly source: DocumentSource;
}

async function readDocument(
  input: DocumentInput,
  genai: GenAiClient,
  tracker: ProvenanceTracker,
): Promise<Result<ReadDocument>> {
  if (input.type === 'text') return ok({ text: input.text, source: 'text' });
  if (!genai.configured) {
    return err(
      appError('UNSUPPORTED_DOCUMENT', 'Reading files needs the AI service, which is offline. Please paste the text instead.'),
    );
  }
  const prompt = buildTranscriptionPrompt();
  const result = await genai.generateText({
    system: prompt.systemInstruction,
    prompt: prompt.prompt,
    files: [{ mimeType: input.mimeType, dataBase64: input.dataBase64 }],
    maxOutputTokens: TRANSCRIPTION_MAX_OUTPUT_TOKENS,
  });
  if (!result.ok) {
    const message = 'We could not read that file right now. Please try again or paste the text.';
    return err(appError(result.error.code, message, result.error.internalHint));
  }
  tracker.model('transcribe', result.value.model, result.value.ms);
  const text = result.value.value.slice(0, MAX_DOCUMENT_CHARS);
  if (text.trim().length < MIN_DOCUMENT_CHARS) {
    return err(appError('UNSUPPORTED_DOCUMENT', 'We could not find enough readable text in that file.'));
  }
  return ok({ text, source: input.mimeType === 'application/pdf' ? 'pdf' : 'image' });
}

/** Stable id: same redacted text + options → same report, which is what makes caching safe. */
function analysisId(text: string, req: AnalyzeRequest): string {
  return createHash('sha256')
    .update([text, req.role ?? '', req.language, req.kindHint ?? ''].join('\u0000'))
    .digest('hex')
    .slice(0, ANALYSIS_ID_HEX_CHARS);
}

export interface AnalysisService {
  analyze(req: AnalyzeRequest): Promise<Result<Analysis>>;
}

/**
 * Creates the analysis pipeline with its own cache.
 * @example
 * const service = createAnalysisService({ genai, now: Date.now, logger });
 */
export function createAnalysisService(deps: ServiceDeps): AnalysisService {
  const { genai, now, logger } = deps;
  const cache = createLruCache<Analysis>({ maxEntries: CACHE_MAX_ENTRIES, ttlMs: CACHE_TTL_MS, now });

  const explain = async (text: string, req: AnalyzeRequest, tracker: ProvenanceTracker) => {
    if (genai.configured) {
      const prompt = buildAnalysisPrompt({
        text,
        language: req.language,
        nonce: createNonce(),
        ...(req.role === undefined ? {} : { role: req.role }),
        ...(req.kindHint === undefined ? {} : { kindHint: req.kindHint }),
      });
      const result = await genai.generateJson({
        system: prompt.systemInstruction,
        prompt: prompt.prompt,
        schema: analysisModelOutputSchema,
        jsonSchema: ANALYSIS_JSON_SCHEMA,
      });
      if (result.ok) {
        tracker.model('explain', result.value.model, result.value.ms);
        return { output: result.value.value, mode: 'gemini' as const };
      }
      logger.log('WARNING', 'analysis fell back to offline', { hint: result.error.internalHint ?? '' });
    }
    const startedAt = now();
    const output = analyzeOffline({
      text,
      language: req.language,
      ...(req.kindHint === undefined ? {} : { kindHint: req.kindHint }),
    });
    tracker.rules('explain-offline', startedAt);
    return { output, mode: 'offline' as const };
  };

  return {
    async analyze(req) {
      const tracker = createProvenanceTracker(now);
      const read = await readDocument(req.document, genai, tracker);
      if (!read.ok) return read;
      const redactStartedAt = now();
      const redacted = redactPii(read.value.text);
      tracker.rules('redact', redactStartedAt);
      const id = analysisId(redacted.text, req);
      const cached = cache.get(id);
      if (cached !== undefined) return ok(cached);

      const { output, mode } = await explain(redacted.text, req, tracker);
      const analysis = assembleAnalysis({
        id,
        output,
        text: redacted.text,
        source: read.value.source,
        redactions: redacted.redactions,
        language: req.language,
        provenance: tracker.build(mode),
        ...(req.role === undefined ? {} : { role: req.role }),
        ...(req.kindHint === undefined ? {} : { kindHint: req.kindHint }),
      });
      cache.set(id, analysis);
      return ok(analysis);
    },
  };
}
