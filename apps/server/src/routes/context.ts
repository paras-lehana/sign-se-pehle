/**
 * Route context — everything a route module needs, built once in server.ts.
 *
 * Responsibility: one typed bag of services and middleware so route files stay
 * declarative. Boundary: no logic; construction happens in buildApp.
 */
import type { RequestHandler } from 'express';
import type { ServerConfig } from '../config.js';
import type { AnalysisService } from '../services/analysis-service.js';
import type { ConcurrencyGate } from '../services/concurrency.js';
import type { GenAiClient } from '../services/genai-client.js';
import type { NegotiationService } from '../services/negotiation-service.js';
import type { QaService } from '../services/qa-service.js';
import type { SpeechService } from '../services/speech-service.js';

export interface RouteContext {
  readonly config: ServerConfig;
  readonly genai: GenAiClient;
  readonly analysis: AnalysisService;
  readonly qa: QaService;
  readonly negotiation: NegotiationService;
  /** Read-aloud: translation plus the Google, Sarvam and Gemini voices. */
  readonly speech: SpeechService;
  /** Caps simultaneous model-backed requests. */
  readonly gate: ConcurrencyGate;
  /** Stricter per-IP limiter for the model-backed routes. */
  readonly aiLimiter: RequestHandler;
  /** JSON parser with the default (small) body limit. */
  readonly smallJson: RequestHandler;
  /** JSON parser sized for pasted documents (ask carries one, compare carries two). */
  readonly documentJson: RequestHandler;
  /** JSON parser with the upload-sized limit, used only by POST /api/analyze. */
  readonly uploadJson: RequestHandler;
}
