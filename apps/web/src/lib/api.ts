/**
 * Typed API client for every server endpoint.
 *
 * Responsibility: send JSON to /api, validate every JSON response with the shared core
 * zod schemas (and check that audio replies really are audio) and turn failures into a
 * typed {@link ApiError} value. Boundary: this is the only module that calls `fetch`;
 * components receive `Result`s and never parse JSON.
 */
import { z } from 'zod';
import {
  type Analysis,
  type AnalyzeRequest,
  type AskResponse,
  type CompareResponse,
  type ScenarioResult,
  type AskRequest,
  type CompareRequest,
  type ErrorCode,
  type GoogleServicesResponse,
  type NegotiateRequest,
  type NegotiateResponse,
  type Result,
  type SimulateRequest,
  type SpeechRequest,
  HTTP_STATUS_BY_CODE,
  analysisSchema,
  askResponseSchema,
  compareResponseSchema,
  err,
  googleServicesResponseSchema,
  negotiateResponseSchema,
  ok,
  scenarioResultSchema,
} from '@sign-se-pehle/core';

/** A failure the UI can show: always a known code and a user-safe message. */
export interface ApiError {
  readonly code: ErrorCode;
  readonly message: string;
  /** HTTP status, or 0 when the request never reached the server. */
  readonly status: number;
}

export type {
  Analysis,
  AskResponse,
  CompareResponse,
  GoogleServicesResponse,
  NegotiateResponse,
  ScenarioResult,
} from '@sign-se-pehle/core';

/** Tolerant (non-strict) shape: the web only reads the health fields it shows. */
export const healthResponseSchema = z.object({
  status: z.string(),
  version: z.string(),
  ai: z.object({ configured: z.boolean(), models: z.array(z.string()) }),
});

export type HealthResponse = z.output<typeof healthResponseSchema>;

const errorEnvelopeSchema = z.object({
  error: z.object({ code: z.string(), message: z.string().min(1) }),
});

const NETWORK_ERROR: ApiError = {
  code: 'INTERNAL',
  message: 'We could not reach Sign Se Pehle. Please check your connection and try again.',
  status: 0,
};

const UNREADABLE_RESPONSE_MESSAGE = 'The server sent a reply we could not read. Please try again.';

function isErrorCode(value: string): value is ErrorCode {
  return Object.hasOwn(HTTP_STATUS_BY_CODE, value);
}

async function readJson(response: Response): Promise<unknown> {
  try {
    const body: unknown = await response.json();
    return body;
  } catch {
    return undefined;
  }
}

function unreadableResponse(status: number): ApiError {
  return { code: 'INTERNAL', message: UNREADABLE_RESPONSE_MESSAGE, status };
}

function toApiError(status: number, body: unknown): ApiError {
  const envelope = errorEnvelopeSchema.safeParse(body);
  if (!envelope.success) return unreadableResponse(status);
  const { code, message } = envelope.data.error;
  return { code: isErrorCode(code) ? code : 'INTERNAL', message, status };
}

/** Sends one request; resolves to the raw response only when the server answered 2xx. */
async function send(
  path: string,
  payload: unknown,
  accept: string,
): Promise<Result<Response, ApiError>> {
  let response: Response;
  try {
    response =
      payload === undefined
        ? await fetch(path, { headers: { Accept: accept } })
        : await fetch(path, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: accept },
            body: JSON.stringify(payload),
          });
  } catch {
    return err(NETWORK_ERROR);
  }
  if (!response.ok) return err(toApiError(response.status, await readJson(response)));
  return ok(response);
}

async function request<S extends z.ZodType>(
  path: string,
  schema: S,
  payload?: unknown,
): Promise<Result<z.output<S>, ApiError>> {
  const sent = await send(path, payload, 'application/json');
  if (!sent.ok) return sent;
  const parsed = schema.safeParse(await readJson(sent.value));
  return parsed.success ? ok(parsed.data) : err(unreadableResponse(sent.value.status));
}

/** POST /api/analyze — explain one pasted or uploaded document. */
export function analyzeDocument(payload: AnalyzeRequest): Promise<Result<Analysis, ApiError>> {
  return request('/api/analyze', analysisSchema, payload);
}

/** POST /api/ask — a grounded question about the analysed text. */
export function askQuestion(payload: AskRequest): Promise<Result<AskResponse, ApiError>> {
  return request('/api/ask', askResponseSchema, payload);
}

/** POST /api/compare — two drafts of the same agreement. */
export function compareDocuments(
  payload: CompareRequest,
): Promise<Result<CompareResponse, ApiError>> {
  return request('/api/compare', compareResponseSchema, payload);
}

/** POST /api/simulate — a deterministic what-if scenario from the document's own numbers. */
export function simulateScenario(
  payload: SimulateRequest,
): Promise<Result<ScenarioResult, ApiError>> {
  return request('/api/simulate', scenarioResultSchema, payload);
}

/** GET /api/health — service version and whether Gemini is configured. */
export function getHealth(): Promise<Result<HealthResponse, ApiError>> {
  return request('/api/health', healthResponseSchema);
}

/** GET /api/google-services — the catalogue of Google services the product uses. */
export function getGoogleServices(): Promise<Result<GoogleServicesResponse, ApiError>> {
  return request('/api/google-services', googleServicesResponseSchema);
}

/** POST /api/negotiate — fairer wording for the risky clauses plus a ready-to-send message. */
export function negotiate(payload: NegotiateRequest): Promise<Result<NegotiateResponse, ApiError>> {
  return request('/api/negotiate', negotiateResponseSchema, payload);
}

/**
 * POST /api/speech — Gemini read-aloud audio. Anything that is not audio (an HTML error
 * page from a proxy, a JSON body) is rejected so the caller falls back to device speech.
 */
export async function synthesizeSpeech(payload: SpeechRequest): Promise<Result<Blob, ApiError>> {
  const sent = await send('/api/speech', payload, 'audio/wav');
  if (!sent.ok) return sent;
  const contentType = sent.value.headers.get('content-type') ?? '';
  if (!contentType.startsWith('audio/')) return err(unreadableResponse(sent.value.status));
  try {
    return ok(await sent.value.blob());
  } catch {
    return err(unreadableResponse(sent.value.status));
  }
}
