/**
 * Static web serving — the built SPA on the same origin as the API.
 *
 * Responsibility: serve hashed assets with a year-long immutable cache, index.html
 * with no-cache (so deploys take effect immediately), and fall back to index.html
 * for client-side routes. Boundary: never handles /api paths.
 */
import { existsSync } from 'node:fs';
import { join, sep } from 'node:path';
import { appError } from '@sign-se-pehle/core';
import express, { type Express } from 'express';
import { sendError } from './http/respond.js';

/** One year: Vite fingerprints /assets/* file names, so their content never changes. */
const IMMUTABLE_CACHE = 'public, max-age=31536000, immutable';

/** Revalidate every time so a new deploy's index.html (and asset names) is picked up. */
const NO_CACHE = 'no-cache';

const ASSETS_SEGMENT = `${sep}assets${sep}`;

/**
 * Mounts static serving and the SPA fallback for `webDistDir`.
 * @example
 * registerStaticWeb(app, config.webDistDir);
 */
export function registerStaticWeb(app: Express, webDistDir: string): void {
  const indexPath = join(webDistDir, 'index.html');
  app.use(
    express.static(webDistDir, {
      index: false,
      setHeaders(res, filePath) {
        res.setHeader('Cache-Control', filePath.includes(ASSETS_SEGMENT) ? IMMUTABLE_CACHE : NO_CACHE);
      },
    }),
  );
  app.use((req, res, next) => {
    if ((req.method !== 'GET' && req.method !== 'HEAD') || req.path.startsWith('/api')) {
      next();
      return;
    }
    // Checked per request so a web build produced after startup is still served.
    if (!existsSync(indexPath)) {
      sendError(res, appError('NOT_FOUND'));
      return;
    }
    res.setHeader('Cache-Control', NO_CACHE);
    res.sendFile(indexPath);
  });
}
