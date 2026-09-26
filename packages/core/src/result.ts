/**
 * Result — errors as values for every cross-module boundary.
 *
 * Responsibility: give core functions a single, typed way to report failure
 * without throwing. Boundary: core never throws for expected failures; the
 * server maps an `AppError` to an HTTP status in one place (see errors.ts).
 */
import type { AppError } from './errors.js';

/** Successful outcome carrying a value. */
export interface Ok<T> {
  readonly ok: true;
  readonly value: T;
}

/** Failed outcome carrying a typed error. */
export interface Err<E> {
  readonly ok: false;
  readonly error: E;
}

/** Either a value or a typed error. Defaults the error side to {@link AppError}. */
export type Result<T, E = AppError> = Ok<T> | Err<E>;

/**
 * Wraps a value in a successful result.
 * @example
 * const parsed = ok(42); // { ok: true, value: 42 }
 */
export function ok<T>(value: T): Ok<T> {
  return { ok: true, value };
}

/**
 * Wraps an error in a failed result.
 * @example
 * const failed = err(appError('VALIDATION_FAILED', 'Text is empty'));
 */
export function err<E>(error: E): Err<E> {
  return { ok: false, error };
}

/**
 * Transforms the value of a successful result, passing failures through untouched.
 * @example
 * mapResult(ok(2), (n) => n * 2); // { ok: true, value: 4 }
 */
export function mapResult<T, U, E>(result: Result<T, E>, transform: (value: T) => U): Result<U, E> {
  return result.ok ? ok(transform(result.value)) : result;
}

/**
 * Returns the value of a successful result or the supplied fallback.
 * @example
 * unwrapOr(err(appError('NOT_FOUND', 'x')), 0); // 0
 */
export function unwrapOr<T, E>(result: Result<T, E>, fallback: T): T {
  return result.ok ? result.value : fallback;
}
