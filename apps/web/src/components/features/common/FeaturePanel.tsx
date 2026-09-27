/**
 * A titled card for one feature panel (Negotiate, Next steps, Brief).
 *
 * Responsibility: consistent panel markup — a region labelled by its own h3 — so each
 * feature is reachable by heading navigation wherever the workspace places it.
 * Boundary: layout only; panels own their content and state.
 */
import type { ReactElement, ReactNode } from 'react';

interface FeaturePanelProps {
  /** Unique on the page; the heading id is derived from it. */
  readonly id: string;
  readonly title: string;
  readonly intro?: string;
  readonly children: ReactNode;
}

export function FeaturePanel({ id, title, intro, children }: FeaturePanelProps): ReactElement {
  const headingId = `${id}-heading`;
  return (
    <section className="card feature-panel" aria-labelledby={headingId}>
      <h3 id={headingId} className="feature-panel__title">
        {title}
      </h3>
      {intro === undefined ? null : <p className="feature-panel__intro">{intro}</p>}
      {children}
    </section>
  );
}
