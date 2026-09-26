/**
 * A titled report card.
 *
 * Responsibility: consistent section markup (a labelled region with an h3) so every
 * report part is reachable by heading navigation. Boundary: layout only.
 */
import type { ReactElement, ReactNode } from 'react';

interface ReportSectionProps {
  readonly id: string;
  readonly title: string;
  readonly children: ReactNode;
  readonly intro?: string;
}

export function ReportSection({ id, title, intro, children }: ReportSectionProps): ReactElement {
  const headingId = `${id}-heading`;
  return (
    <section className="card report-section" aria-labelledby={headingId}>
      <h3 id={headingId}>{title}</h3>
      {intro === undefined ? null : <p className="report-section__intro">{intro}</p>}
      {children}
    </section>
  );
}
