/**
 * In-flight concurrency gate for model-backed work.
 *
 * Responsibility: cap simultaneous AI pipelines per instance so a burst cannot
 * exhaust memory or model quota. Boundary: rejects immediately with RATE_LIMITED
 * rather than queueing — a fast "try again" beats a request that times out.
 */
import { type Result, appError, err } from '@sign-se-pehle/core';

export interface ConcurrencyGate {
  run<T>(task: () => Promise<Result<T>>): Promise<Result<T>>;
  readonly inFlight: number;
}

/**
 * Creates a gate that allows at most `max` tasks at once.
 * @example
 * const gate = createConcurrencyGate(4); await gate.run(() => service.analyze(body));
 */
export function createConcurrencyGate(max: number): ConcurrencyGate {
  let inFlight = 0;
  return {
    async run(task) {
      if (inFlight >= max) return err(appError('RATE_LIMITED'));
      inFlight += 1;
      try {
        return await task();
      } finally {
        inFlight -= 1;
      }
    },
    get inFlight() {
      return inFlight;
    },
  };
}
