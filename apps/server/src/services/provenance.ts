/**
 * Provenance tracking for one request.
 *
 * Responsibility: record which engine handled each pipeline step and how long it
 * took, so every response can show readers exactly how it was produced.
 * Boundary: timing only — no request content is recorded.
 */
import type { EngineMode, Provenance } from '@sign-se-pehle/core';

/** Engine label for deterministic, rule-based steps. */
export const RULES_ENGINE = 'rules';

export interface ProvenanceTracker {
  /** Records a step handled by a named model (its name is also listed under `models`). */
  model(name: string, model: string, ms: number): void;
  /** Records a deterministic step, timing it from `startedAt`. */
  rules(name: string, startedAt: number): void;
  build(mode: EngineMode): Provenance;
}

/**
 * Creates a tracker whose total latency is measured from creation.
 * @example
 * const tracker = createProvenanceTracker(Date.now); tracker.build('offline');
 */
export function createProvenanceTracker(now: () => number): ProvenanceTracker {
  const startedAt = now();
  const steps: { name: string; engine: string; ms: number }[] = [];
  const models: string[] = [];

  return {
    model(name, model, ms) {
      steps.push({ name, engine: model, ms: Math.max(0, Math.round(ms)) });
      if (!models.includes(model)) models.push(model);
    },
    rules(name, stepStartedAt) {
      steps.push({ name, engine: RULES_ENGINE, ms: Math.max(0, Math.round(now() - stepStartedAt)) });
    },
    build(mode) {
      return {
        mode,
        models: [...models],
        latencyMs: Math.max(0, Math.round(now() - startedAt)),
        steps: [...steps],
      };
    },
  };
}
