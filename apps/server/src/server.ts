/**
 * Express application factory — API plus static web, fully dependency-injected.
 *
 * Responsibility: assemble security headers, compression, body limits, rate limits,
 * routes, static serving and the error envelope in the right order.
 * Boundary: no listening, no env reads, no real clock — index.ts supplies those,
 * so tests build the exact production app with fakes.
 */
import { appError } from '@sign-se-pehle/core';
import compression from 'compression';
import express, { type Express } from 'express';
import helmet from 'helmet';
import type { ServerConfig } from './config.js';
import { sendError } from './http/respond.js';
import type { Logger } from './logger.js';
import { createErrorHandler } from './middleware/error-handler.js';
import { createRateLimiter } from './middleware/rate-limit.js';
import { createRequestLog } from './middleware/request-log.js';
import { registerAnalyze } from './routes/analyze.js';
import { registerAsk } from './routes/ask.js';
import { registerCompare } from './routes/compare.js';
import type { RouteContext } from './routes/context.js';
import { registerHealth } from './routes/health.js';
import { registerServices } from './routes/services.js';
import { registerSimulate } from './routes/simulate.js';
import { createAnalysisService } from './services/analysis-service.js';
import { createConcurrencyGate } from './services/concurrency.js';
import type { GenAiClient } from './services/genai-client.js';
import { createQaService } from './services/qa-service.js';
import { registerStaticWeb } from './static-web.js';

/** Model-backed routes cost quota: 30 per minute per IP is generous for a human reader. */
const AI_REQUESTS_PER_MINUTE = 30;

/** Everything else (health, simulate, catalog). */
const API_REQUESTS_PER_MINUTE = 120;

/** Simultaneous model pipelines per instance; 512 MiB comfortably holds four large documents. */
const MAX_IN_FLIGHT_AI = 4;

/** Small JSON bodies (simulate, catalog queries). */
const DEFAULT_BODY_LIMIT = '64kb';

/** Two 60k-character documents in a 3-byte-per-character script, plus JSON overhead. */
const DOCUMENT_BODY_LIMIT = '512kb';

/** A 5 MB upload becomes ~6.7 MB of base64; 8 MB leaves room for the JSON wrapper. */
const UPLOAD_BODY_LIMIT = '8mb';

/** Two years, the preload-list minimum. */
const HSTS_MAX_AGE_SECONDS = 63_072_000;

const PERMISSIONS_POLICY = 'camera=(), microphone=(self), geolocation=()';

/** Only one proxy (the Cloud Run front end) sits in front of the container. */
const TRUSTED_PROXY_HOPS = 1;

export interface AppDeps {
  readonly genai: GenAiClient;
  readonly now: () => number;
  readonly logger: Logger;
}

function securityHeaders(): ReturnType<typeof helmet> {
  const self = "'self'";
  return helmet({
    contentSecurityPolicy: {
      useDefaults: false,
      directives: {
        defaultSrc: [self],
        scriptSrc: [self],
        styleSrc: [self],
        imgSrc: [self, 'data:'],
        connectSrc: [self],
        fontSrc: [self],
        objectSrc: ["'none'"],
        baseUri: [self],
        frameAncestors: ["'none'"],
        formAction: [self],
      },
    },
    crossOriginOpenerPolicy: { policy: 'same-origin' },
    crossOriginResourcePolicy: { policy: 'same-origin' },
    strictTransportSecurity: { maxAge: HSTS_MAX_AGE_SECONDS, includeSubDomains: true },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  });
}

/**
 * Builds the Express app.
 * @example
 * const app = buildApp(loadConfig(), { genai, now: Date.now, logger });
 */
export function buildApp(config: ServerConfig, deps: AppDeps): Express {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', TRUSTED_PROXY_HOPS);
  app.use(createRequestLog(deps.logger, deps.now));
  app.use(securityHeaders());
  app.use((_req, res, next) => {
    res.setHeader('Permissions-Policy', PERMISSIONS_POLICY);
    next();
  });
  app.use(compression());

  const services = { genai: deps.genai, now: deps.now, logger: deps.logger };
  const ctx: RouteContext = {
    config,
    genai: deps.genai,
    analysis: createAnalysisService(services),
    qa: createQaService(services),
    gate: createConcurrencyGate(MAX_IN_FLIGHT_AI),
    aiLimiter: createRateLimiter({ perMinute: AI_REQUESTS_PER_MINUTE, now: deps.now }),
    smallJson: express.json({ limit: DEFAULT_BODY_LIMIT }),
    documentJson: express.json({ limit: DOCUMENT_BODY_LIMIT }),
    uploadJson: express.json({ limit: UPLOAD_BODY_LIMIT }),
  };

  const api = express.Router();
  api.use(createRateLimiter({ perMinute: API_REQUESTS_PER_MINUTE, now: deps.now }));
  api.use((_req, res, next) => {
    // API responses can carry document text; never let shared caches keep them.
    res.setHeader('Cache-Control', 'no-store');
    next();
  });
  registerHealth(api, ctx);
  registerServices(api);
  registerAnalyze(api, ctx);
  registerAsk(api, ctx);
  registerCompare(api, ctx);
  registerSimulate(api, ctx);
  api.use((_req, res) => sendError(res, appError('NOT_FOUND')));
  app.use('/api', api);

  registerStaticWeb(app, config.webDistDir);
  app.use((_req, res) => sendError(res, appError('NOT_FOUND')));
  app.use(createErrorHandler(deps.logger));
  return app;
}
