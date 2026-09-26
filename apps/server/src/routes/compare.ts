/**
 * POST /api/compare — what changed between two drafts, and for whom.
 *
 * Boundary: carries two full documents, so it uses the document-sized body parser;
 * the schema still bounds each text to MAX_DOCUMENT_CHARS.
 */
import { compareRequestSchema } from '@sign-se-pehle/core';
import type { Router } from 'express';
import { sendResult } from '../http/respond.js';
import { validate } from '../middleware/validate.js';
import type { RouteContext } from './context.js';

/** Registers the compare route. */
export function registerCompare(router: Router, ctx: RouteContext): void {
  router.post(
    '/compare',
    ctx.aiLimiter,
    ctx.documentJson,
    validate(compareRequestSchema, async (body, _req, res) => {
      sendResult(res, await ctx.gate.run(() => ctx.qa.compare(body)));
    }),
  );
}
