/**
 * GET /api/health — liveness plus AI configuration, used by the deploy smoke test.
 *
 * Boundary: reports model names and whether a key exists, never the key itself.
 */
import type { Router } from 'express';
import type { RouteContext } from './context.js';

/** Registers the health route. */
export function registerHealth(router: Router, ctx: RouteContext): void {
  router.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      version: ctx.config.appVersion,
      ai: { configured: ctx.genai.configured, models: [...ctx.genai.models] },
    });
  });
}
