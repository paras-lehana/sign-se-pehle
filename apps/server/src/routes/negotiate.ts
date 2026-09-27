/**
 * POST /api/negotiate — fairer wording for risky clauses and a ready-to-send request.
 *
 * Responsibility: validate the request and hand it to the negotiation service.
 * Boundary: carries clause quotes, so it uses the document-sized body parser; validation,
 * rate limiting and the concurrency gate run before any model call.
 */
import { negotiateRequestSchema } from '@sign-se-pehle/core';
import type { Router } from 'express';
import { sendResult } from '../http/respond.js';
import { validate } from '../middleware/validate.js';
import type { RouteContext } from './context.js';

/** Registers the negotiate route. */
export function registerNegotiate(router: Router, ctx: RouteContext): void {
  router.post(
    '/negotiate',
    ctx.aiLimiter,
    ctx.documentJson,
    validate(negotiateRequestSchema, async (body, _req, res) => {
      sendResult(res, await ctx.gate.run(() => ctx.negotiation.negotiate(body)));
    }),
  );
}
