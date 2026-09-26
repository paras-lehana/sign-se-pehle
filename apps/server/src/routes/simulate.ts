/**
 * POST /api/simulate — deterministic what-if money calculations (pure core, no model).
 */
import { runScenario, simulateRequestSchema } from '@sign-se-pehle/core';
import type { Router } from 'express';
import { sendResult } from '../http/respond.js';
import { validate } from '../middleware/validate.js';
import type { RouteContext } from './context.js';

/** Registers the simulate route. */
export function registerSimulate(router: Router, ctx: RouteContext): void {
  router.post(
    '/simulate',
    ctx.smallJson,
    validate(simulateRequestSchema, (body, _req, res) => {
      sendResult(res, runScenario(body.scenarioId, body.facts, body.inputs));
    }),
  );
}
