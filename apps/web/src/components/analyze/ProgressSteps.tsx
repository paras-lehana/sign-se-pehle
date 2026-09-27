/**
 * Multi-step progress indicator shown while an analysis runs, drawn as a glowing pipeline.
 *
 * Responsibility: tell the reader what the pipeline is doing during a request that
 * takes a few seconds. Boundary: the steps advance on a timer because the API
 * answers once; the last step stays active until the response arrives.
 */
import { type ReactElement, useEffect, useState } from 'react';

export const ANALYSIS_STEPS = [
  'Reading your document',
  'Explaining with Gemini',
  'Checking against Indian law',
  'Verifying quotes',
] as const;

/** Typical Gemini analysis takes 4 to 8 seconds; ~1.8 s per step keeps the bar honest. */
const STEP_ADVANCE_MS = 1800;

export function ProgressSteps(): ReactElement {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActive((current) => Math.min(current + 1, ANALYSIS_STEPS.length - 1));
    }, STEP_ADVANCE_MS);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="progress glass glass--blur" role="status" aria-live="polite">
      <p className="progress__title">
        Working on it — step {active + 1} of {ANALYSIS_STEPS.length}
      </p>
      <ol className="progress__steps" role="list">
        {ANALYSIS_STEPS.map((step, index) => {
          const state = index < active ? 'done' : index === active ? 'active' : 'pending';
          return (
            <li key={step} className={`progress__step progress__step--${state}`}>
              <span className="progress__marker" aria-hidden="true">
                {state === 'done' ? '✓' : index + 1}
              </span>
              <span>
                {step}
                {state === 'done' ? <span className="visually-hidden"> (done)</span> : null}
                {state === 'active' ? (
                  <span className="visually-hidden"> (in progress)</span>
                ) : null}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
