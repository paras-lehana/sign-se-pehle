/**
 * Obligations: what the reader must do and what the other side must do.
 *
 * Responsibility: two side-by-side lists (stacked on phones). Boundary: display only; the
 * two columns come from one table so the markup stays in a single component.
 */
import type { ReactElement } from 'react';
import type { Analysis } from '../../lib/api';
import { ReportSection } from './ReportSection';

interface ObligationsProps {
  readonly obligations: Analysis['obligations'];
}

export function Obligations({ obligations }: ObligationsProps): ReactElement | null {
  if (obligations.yours.length === 0 && obligations.theirs.length === 0) return null;
  const columns = [
    { key: 'yours', title: 'What you must do', items: obligations.yours },
    { key: 'theirs', title: 'What the other side must do', items: obligations.theirs },
  ] as const;
  return (
    <ReportSection id="obligations" title="Who must do what">
      <div className="obligations">
        {columns.map((column) => (
          <div key={column.key} className={`obligations__column obligations__column--${column.key}`}>
            <h4>{column.title}</h4>
            {column.items.length === 0 ? (
              <p className="muted">Nothing specific stated.</p>
            ) : (
              <ul>
                {column.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </ReportSection>
  );
}
