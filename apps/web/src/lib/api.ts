/**
 * Typed API client for every server endpoint.
 *
 * Responsibility: send JSON to /api, validate every response with the shared core zod
 * schemas and turn failures into a typed {@link ApiError} value. Boundary: this is the
 * only module that calls `fetch`; components receive `Result`s and never parse JSON.
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
  type Result,
  type SimulateRequest,
  HTTP_STATUS_BY_CODE,
  analysisSchema,
  askResponseSchema,
  compareResponseSchema,
  err,
  googleServicesResponseSchema,
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

function toApiError(status: number, body: unknown): ApiError {
  const envelope = errorEnvelopeSchema.safeParse(body);
  if (!envelope.success) {
    return { code: 'INTERNAL', message: UNREADABLE_RESPONSE_MESSAGE, status };
  }
  const { code, message } = envelope.data.error;
  return { code: isErrorCode(code) ? code : 'INTERNAL', message, status };
}

async function request<S extends z.ZodType>(
  path: string,
  schema: S,
  payload?: unknown,
): Promise<Result<z.output<S>, ApiError>> {
  let response: Response;
  try {
    response =
      payload === undefined
        ? await fetch(path, { headers: { Accept: 'application/json' } })
        : await fetch(path, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify(payload),
          });
  } catch {
    return err(NETWORK_ERROR);
  }
  const body = await readJson(response);
  if (!response.ok) return err(toApiError(response.status, body));
  const parsed = schema.safeParse(body);
  return parsed.success
    ? ok(parsed.data)
    : err({ code: 'INTERNAL', message: UNREADABLE_RESPONSE_MESSAGE, status: response.status });
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
