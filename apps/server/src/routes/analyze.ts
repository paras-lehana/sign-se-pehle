/**
 * POST /api/analyze — explain one document.
 *
 * Boundary: the only route with the upload-sized body limit; validation, rate
 * limiting and the concurrency gate run before any model call.
 */
import { analyzeRequestSchema } from '@sign-se-pehle/core';
import type { Router } from 'express';
import { sendResult } from '../http/respond.js';
import { validate } from '../middleware/validate.js';
import type { RouteContext } from './context.js';

/** Registers the analyze route. */
export function registerAnalyze(router: Router, ctx: RouteContext): void {
  router.post(
    '/analyze',
    ctx.aiLimiter,
    ctx.uploadJson,
    validate(analyzeRequestSchema, async (body, _req, res) => {
      // Efficiency: if the reader closes the tab, stop the Gemini call instead of paying for it.
      const controller = new AbortController();
      res.on('close', () => {
        if (!res.writableEnded) controller.abort();
      });
      sendResult(res, await ctx.gate.run(() => ctx.analysis.analyze(body, controller.signal)));
    }),
  );
}
