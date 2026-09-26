/**
 * POST /api/ask — a question answered only from the document, with verified citations.
 */
import { askRequestSchema } from '@sign-se-pehle/core';
import type { Router } from 'express';
import { sendResult } from '../http/respond.js';
import { validate } from '../middleware/validate.js';
import type { RouteContext } from './context.js';

/** Registers the ask route. */
export function registerAsk(router: Router, ctx: RouteContext): void {
  router.post(
    '/ask',
    ctx.aiLimiter,
    ctx.documentJson,
    validate(askRequestSchema, async (body, _req, res) => {
      sendResult(res, await ctx.gate.run(() => ctx.qa.ask(body)));
    }),
  );
}
