/**
 * GenAI client — the server's only doorway to a generative model.
 *
 * Responsibility: run one request across the configured models with per-attempt
 * timeouts, fail over on transient errors (remembering the last good model), and
 * zod-validate JSON output. Boundary: the SDK sits behind the injected `ModelCaller`,
 * and returned errors carry only status codes — never the key or upstream text.
 */
import { type Result, appError, err, ok } from '@sign-se-pehle/core';
import type { z } from 'zod';

/** A file sent inline to the model (PDF or photo), base64 encoded. */
export interface InlineFile {
  readonly mimeType: string;
  readonly dataBase64: string;
}

/** One concrete call to one model — what the SDK adapter receives. */
export interface ModelCall {
  readonly model: string;
  readonly system: string;
  readonly prompt: string;
  readonly files: readonly InlineFile[];
  /** JSON Schema for structured output; `undefined` asks for plain text. */
  readonly jsonSchema: unknown;
  readonly maxOutputTokens: number;
  readonly signal: AbortSignal;
}

/** Performs one model call; throws on failure (errors may carry an HTTP `status`). */
export type ModelCaller = (call: ModelCall) => Promise<string | undefined>;

export interface TextRequest {
  readonly system: string;
  readonly prompt: string;
  readonly files?: readonly InlineFile[];
  readonly signal?: AbortSignal;
  readonly maxOutputTokens?: number;
}

export interface JsonRequest<T> extends TextRequest {
  readonly schema: z.ZodType<T>;
  readonly jsonSchema: unknown;
}

export interface Generated<T> {
  readonly value: T;
  readonly model: string;
  readonly ms: number;
}

export interface GenAiClient {
  readonly configured: boolean;
  readonly models: readonly string[];
  generateJson<T>(req: JsonRequest<T>): Promise<Result<Generated<T>>>;
  generateText(req: TextRequest): Promise<Result<Generated<string>>>;
}

export interface GenAiClientOptions {
  readonly caller: ModelCaller;
  readonly models: readonly string[];
  readonly timeoutMs: number;
  readonly now: () => number;
}

/** Default output budget: a 40-clause analysis in JSON fits comfortably in 16k tokens. */
const DEFAULT_MAX_OUTPUT_TOKENS = 16_384;

/**
 * Statuses worth trying the next model for: 400 (a model rejecting a config option),
 * 404 (model not enabled for the project), 408/429 (quota, overload) and 5xx.
 * 401/403 are key problems that no other model will fix.
 */
const RETRYABLE_STATUSES: ReadonlySet<number> = new Set([400, 404, 408, 429, 500, 502, 503, 504]);

const MARKDOWN_FENCE_START = /^```(?:json)?\s*/i;
const MARKDOWN_FENCE_END = /\s*```$/;

type Attempt =
  | { readonly kind: 'ok'; readonly text: string }
  | { readonly kind: 'failed'; readonly timedOut: boolean; readonly retryable: boolean; readonly hint: string };

function statusOf(error: unknown): number | undefined {
  if (typeof error === 'object' && error !== null && 'status' in error) {
    return typeof error.status === 'number' ? error.status : undefined;
  }
  return undefined;
}

/** Rejects when `signal` aborts — guards against callers that ignore their signal. */
function rejectOnAbort(signal: AbortSignal): Promise<never> {
  return new Promise((_resolve, reject) => {
    const fail = (): void => reject(new Error('aborted'));
    if (signal.aborted) fail();
    else signal.addEventListener('abort', fail, { once: true });
  });
}

/** Parses model JSON, tolerating a markdown fence around it, then validates it with zod. */
export function parseModelJson<T>(text: string, schema: z.ZodType<T>): Result<T> {
  const unfenced = text.trim().replace(MARKDOWN_FENCE_START, '').replace(MARKDOWN_FENCE_END, '');
  let raw: unknown;
  try {
    raw = JSON.parse(unfenced);
  } catch {
    return err(appError('UPSTREAM_FAILURE', undefined, 'model output is not JSON'));
  }
  const parsed = schema.safeParse(raw);
  return parsed.success
    ? ok(parsed.data)
    : err(appError('UPSTREAM_FAILURE', undefined, 'model output failed schema validation'));
}

/**
 * Creates a failover client over `options.models`.
 * @example
 * const client = createGenAiClient({ caller, models: ['a', 'b'], timeoutMs: 45_000, now: Date.now });
 */
export function createGenAiClient(options: GenAiClientOptions): GenAiClient {
  const { caller, models, timeoutMs, now } = options;
  let preferred: string | undefined;

  const callOnce = async (model: string, req: TextRequest, jsonSchema: unknown): Promise<Attempt> => {
    const timeout = AbortSignal.timeout(timeoutMs);
    const signal = req.signal === undefined ? timeout : AbortSignal.any([req.signal, timeout]);
    const call: ModelCall = {
      model,
      system: req.system,
      prompt: req.prompt,
      files: req.files ?? [],
      jsonSchema,
      maxOutputTokens: req.maxOutputTokens ?? DEFAULT_MAX_OUTPUT_TOKENS,
      signal,
    };
    try {
      const text = await Promise.race([caller(call), rejectOnAbort(signal)]);
      if (text === undefined || text.trim().length === 0) {
        return { kind: 'failed', timedOut: false, retryable: true, hint: 'empty response' };
      }
      return { kind: 'ok', text };
    } catch (error: unknown) {
      if (timeout.aborted) return { kind: 'failed', timedOut: true, retryable: true, hint: 'timeout' };
      const status = statusOf(error);
      // Unknown failures (network resets) are treated as transient: another model may succeed.
      const retryable = status === undefined || RETRYABLE_STATUSES.has(status);
      return { kind: 'failed', timedOut: false, retryable, hint: `status ${status ?? 'none'}` };
    }
  };

  const run = async <T>(
    req: TextRequest,
    jsonSchema: unknown,
    parse: (text: string) => Result<T>,
  ): Promise<Result<Generated<T>>> => {
    const order = [...models.filter((m) => m === preferred), ...models.filter((m) => m !== preferred)];
    let timedOut = false;
    let hint = 'no models configured';
    for (const model of order) {
      const startedAt = now();
      const attempt = await callOnce(model, req, jsonSchema);
      if (attempt.kind === 'ok') {
        const parsed = parse(attempt.text);
        if (parsed.ok) {
          preferred = model;
          return ok({ value: parsed.value, model, ms: now() - startedAt });
        }
        hint = `${model}: ${parsed.error.internalHint ?? 'invalid output'}`;
        continue;
      }
      timedOut = timedOut || attempt.timedOut;
      hint = `${model}: ${attempt.hint}`;
      if (!attempt.retryable || req.signal?.aborted === true) break;
    }
    return err(appError(timedOut ? 'UPSTREAM_TIMEOUT' : 'UPSTREAM_FAILURE', undefined, hint));
  };

  return {
    configured: true,
    models,
    generateJson: (req) => run(req, req.jsonSchema, (text) => parseModelJson(text, req.schema)),
    generateText: (req) => run(req, undefined, (text) => ok(text.trim())),
  };
}

/**
 * A client for when no API key is configured: every call fails fast so callers take
 * their offline path.
 * @example
 * createOfflineGenAiClient().configured; // false
 */
export function createOfflineGenAiClient(): GenAiClient {
  const offline = appError('UPSTREAM_FAILURE', undefined, 'no API key configured');
  return {
    configured: false,
    models: [],
    generateJson: () => Promise.resolve(err(offline)),
    generateText: () => Promise.resolve(err(offline)),
  };
}
