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
 * Runs `task` over `items` with at most `limit` running at once and returns the results in
 * input order — used to fetch the parts of a long read-aloud text in parallel.
 * @example
 * await mapWithConcurrency(parts, 4, (part) => speakPart(part)); // same order as parts
 */
export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  task: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  // One shared iterator: each worker takes the next unclaimed item until none are left.
  const queue = items.entries();
  async function worker(): Promise<void> {
    for (const [index, item] of queue) results[index] = await task(item);
  }
  const workers = Math.max(1, Math.min(limit, items.length));
  await Promise.all(Array.from({ length: workers }, worker));
  return results;
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
