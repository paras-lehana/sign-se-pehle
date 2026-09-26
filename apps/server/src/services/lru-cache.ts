/**
 * Small LRU cache with time-to-live.
 *
 * Responsibility: remember recent analyses so re-submitting the same document is
 * instant and free. Boundary: in-memory, per instance; the clock is injected so
 * expiry is testable without waiting.
 */

export interface LruCacheOptions {
  readonly maxEntries: number;
  readonly ttlMs: number;
  readonly now: () => number;
}

export interface LruCache<V> {
  get(key: string): V | undefined;
  set(key: string, value: V): void;
  readonly size: number;
}

interface Entry<V> {
  readonly value: V;
  readonly expiresAt: number;
}

/**
 * Creates an LRU cache. A `Map` iterates in insertion order, so re-inserting on read
 * keeps the least recently used entry first — the one evicted when full.
 * @example
 * const cache = createLruCache<string>({ maxEntries: 50, ttlMs: 1_800_000, now: Date.now });
 */
export function createLruCache<V>(options: LruCacheOptions): LruCache<V> {
  const { maxEntries, ttlMs, now } = options;
  const entries = new Map<string, Entry<V>>();

  return {
    get(key) {
      const entry = entries.get(key);
      if (entry === undefined) return undefined;
      entries.delete(key);
      if (entry.expiresAt <= now()) return undefined;
      entries.set(key, entry);
      return entry.value;
    },
    set(key, value) {
      entries.delete(key);
      entries.set(key, { value, expiresAt: now() + ttlMs });
      for (const oldest of entries.keys()) {
        if (entries.size <= maxEntries) break;
        entries.delete(oldest);
      }
    },
    get size() {
      return entries.size;
    },
  };
}
