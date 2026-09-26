/**
 * AppError — the closed error taxonomy shared by core, server and web.
 *
 * Responsibility: one list of error codes, each mapped to exactly one HTTP
 * status and one user-safe message. Boundary: `internalHint` is for logs only
 * and is never serialised to a client (see {@link toPublicError}).
 */

/** Every failure the product can report. Adding a code forces the tables below to be updated. */
export type ErrorCode =
  | 'VALIDATION_FAILED'
  | 'UNSUPPORTED_DOCUMENT'
  | 'DOCUMENT_TOO_LARGE'
  | 'NOT_FOUND'
  | 'RATE_LIMITED'
  | 'UPSTREAM_FAILURE'
  | 'UPSTREAM_TIMEOUT'
  | 'SAFETY_BLOCKED'
  | 'INTERNAL';

/** A typed, serialisable failure. */
export interface AppError {
  readonly code: ErrorCode;
  /** Short, user-safe explanation. Never contains user input or upstream text. */
  readonly message: string;
  /** Server-side diagnostic detail. Logged, never returned to clients. */
  readonly internalHint?: string;
}

/** The only shape an error takes on the wire. */
export interface PublicError {
  readonly code: ErrorCode;
  readonly message: string;
}

/** HTTP status for every error code — a `Record` so a missing code is a compile error. */
export const HTTP_STATUS_BY_CODE: Readonly<Record<ErrorCode, number>> = {
  VALIDATION_FAILED: 400,
  UNSUPPORTED_DOCUMENT: 415,
  DOCUMENT_TOO_LARGE: 413,
  NOT_FOUND: 404,
  RATE_LIMITED: 429,
  UPSTREAM_FAILURE: 502,
  UPSTREAM_TIMEOUT: 504,
  SAFETY_BLOCKED: 422,
  INTERNAL: 500,
};

/** Default user-facing copy per code, written for a non-lawyer reading on a phone. */
export const DEFAULT_MESSAGE_BY_CODE: Readonly<Record<ErrorCode, string>> = {
  VALIDATION_FAILED: 'Some details look incomplete. Please check the highlighted fields.',
  UNSUPPORTED_DOCUMENT: 'Please upload a PDF, a photo (JPG, PNG or WebP) or paste the text.',
  DOCUMENT_TOO_LARGE: 'That document is too large. Please upload a file under the size limit.',
  NOT_FOUND: 'We could not find what you were looking for.',
  RATE_LIMITED: 'You are going a little fast. Please wait a moment and try again.',
  UPSTREAM_FAILURE: 'The AI service is busy right now. A basic offline analysis is shown instead.',
  UPSTREAM_TIMEOUT: 'The AI service took too long to respond. Please try again.',
  SAFETY_BLOCKED: 'This request could not be processed safely. Please rephrase it.',
  INTERNAL: 'Something went wrong on our side. Please try again.',
};

/**
 * Builds an {@link AppError}; the message defaults to the user-safe copy for the code.
 * @example
 * appError('RATE_LIMITED'); // { code: 'RATE_LIMITED', message: 'You are going a little fast…' }
 */
export function appError(code: ErrorCode, message?: string, internalHint?: string): AppError {
  const base = { code, message: message ?? DEFAULT_MESSAGE_BY_CODE[code] };
  return internalHint === undefined ? base : { ...base, internalHint };
}

/**
 * Strips server-only fields so an error can be sent to a client.
 * @example
 * toPublicError(appError('INTERNAL', undefined, 'db down')); // { code: 'INTERNAL', message: '…' }
 */
export function toPublicError(error: AppError): PublicError {
  return { code: error.code, message: error.message };
}

/**
 * Maps an error code to its HTTP status.
 * @example
 * httpStatusFor('NOT_FOUND'); // 404
 */
export function httpStatusFor(code: ErrorCode): number {
  return HTTP_STATUS_BY_CODE[code];
}
