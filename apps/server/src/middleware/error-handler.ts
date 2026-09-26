/**
 * Last-resort error handler.
 *
 * Responsibility: map body-parser failures (oversize, malformed JSON) to their envelope
 * and turn anything unexpected into a generic 500. Boundary: stack traces and upstream
 * text are logged server-side only, never sent to the client.
 */
import { type AppError, appError } from '@sign-se-pehle/core';
import type { ErrorRequestHandler } from 'express';
import { sendError } from '../http/respond.js';
import type { Logger } from '../logger.js';

/** body-parser error types (see the body-parser README, "Errors"). */
const TOO_LARGE_TYPE = 'entity.too.large';
const PARSE_FAILED_TYPE = 'entity.parse.failed';

/** Reads the `type` tag body-parser attaches to its errors, if present. */
function bodyParserType(error: unknown): string | undefined {
  if (typeof error === 'object' && error !== null && 'type' in error) {
    return typeof error.type === 'string' ? error.type : undefined;
  }
  return undefined;
}

function toAppError(error: unknown): AppError {
  const type = bodyParserType(error);
  if (type === TOO_LARGE_TYPE) return appError('DOCUMENT_TOO_LARGE');
  if (type === PARSE_FAILED_TYPE) {
    return appError('VALIDATION_FAILED', 'The request body is not valid JSON.');
  }
  return appError('INTERNAL', undefined, error instanceof Error ? error.message : 'non-error thrown');
}

/**
 * Creates the Express error handler (must be registered last).
 * @example
 * app.use(createErrorHandler(logger));
 */
export function createErrorHandler(logger: Logger): ErrorRequestHandler {
  return (error: unknown, _req, res, next) => {
    if (res.headersSent) {
      next(error);
      return;
    }
    const appErr = toAppError(error);
    if (appErr.code === 'INTERNAL') {
      logger.log('ERROR', 'unhandled error', { hint: appErr.internalHint ?? 'unknown' });
    }
    sendError(res, appErr);
  };
}
