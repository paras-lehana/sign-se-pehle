/**
 * Pause / resume decorative animation.
 *
 * Responsibility: WCAG 2.2.2 (Pause, Stop, Hide) — the mesh drift, the scan illustration
 * and the marquee loop for longer than five seconds, so readers get one control that
 * stops them all. Boundary: sets `data-motion` via preferences.ts; the CSS motion policy
 * does the stopping. Reduced-motion users never see the loops in the first place.
 */
import { type ReactElement, useEffect, useState } from 'react';
import { applyMotion, initialMotionPaused, storeMotionPaused } from './preferences';

export function MotionToggle(): ReactElement {
  const [paused, setPaused] = useState<boolean>(initialMotionPaused);

  useEffect(() => {
    applyMotion(paused);
  }, [paused]);

  function toggle(): void {
    setPaused(!paused);
    storeMotionPaused(!paused);
  }

  return (
    <button
      type="button"
      className="icon-button"
      aria-pressed={paused}
      title="Pause animations"
      onClick={toggle}
    >
      {paused ? (
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M8 5.5v13l10-6.5z" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M9 6v12M15 6v12" />
        </svg>
      )}
      <span className="visually-hidden">Pause animations</span>
    </button>
  );
}
