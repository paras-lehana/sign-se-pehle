/**
 * Obligations: what the reader must do and what the other side must do.
 *
 * Responsibility: two side-by-side lists (stacked on phones). Boundary: display only.
 */
import type { ReactElement } from 'react';
import type { Analysis } from '../../lib/api';
import { ReportSection } from './ReportSection';

interface ObligationsProps {
  readonly obligations: Analysis['obligations'];
}

interface ObligationListProps {
  readonly title: string;
  readonly items: readonly string[];
}

function ObligationList({ title, items }: ObligationListProps): ReactElement {
  return (
    <div className="obligations__column">
      <h4>{title}</h4>
      {items.length === 0 ? (
        <p className="muted">Nothing specific stated.</p>
      ) : (
        <ul>
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function Obligations({ obligations }: ObligationsProps): ReactElement | null {
  if (obligations.yours.length === 0 && obligations.theirs.length === 0) return null;
  return (
    <ReportSection id="obligations" title="Who must do what">
      <div className="obligations">
        <ObligationList title="What you must do" items={obligations.yours} />
        <ObligationList title="What the other side must do" items={obligations.theirs} />
      </div>
    </ReportSection>
  );
}
