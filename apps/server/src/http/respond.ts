/**
 * Response helpers — the single place an `AppError` becomes an HTTP response.
 *
 * Responsibility: the uniform `{ error: PublicError }` envelope and status mapping.
 * Boundary: `internalHint` never leaves the process (toPublicError strips it).
 */
import { type AppError, type Result, httpStatusFor, toPublicError } from '@sign-se-pehle/core';
import type { Response } from 'express';

/** Sends the uniform error envelope with the status mapped from the error code. */
export function sendError(res: Response, error: AppError): void {
  res.status(httpStatusFor(error.code)).json({ error: toPublicError(error) });
}

/** Sends a successful value as JSON, or the error envelope for a failed result. */
export function sendResult<T>(res: Response, result: Result<T>): void {
  if (result.ok) {
    res.json(result.value);
    return;
  }
  sendError(res, result.error);
}
