/**
 * GET /api/google-services — the catalog of Google services this app uses.
 *
 * Boundary: the catalog lists environment variable NAMES only, never values.
 */
import { GOOGLE_SERVICES } from '@sign-se-pehle/core';
import type { Router } from 'express';

/** Registers the service-catalog route. */
export function registerServices(router: Router): void {
  router.get('/google-services', (_req, res) => {
    res.json({ services: GOOGLE_SERVICES });
  });
}
