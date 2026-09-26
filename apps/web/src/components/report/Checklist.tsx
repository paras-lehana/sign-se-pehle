/**
 * Before-you-sign checklist with local tick state.
 *
 * Responsibility: let readers tick off checks as they go. Boundary: state is local to
 * this page view — nothing is stored or sent.
 */
import { type ReactElement, useState } from 'react';
import { ReportSection } from './ReportSection';

interface ChecklistProps {
  readonly items: readonly string[];
}

export function Checklist({ items }: ChecklistProps): ReactElement | null {
  const [done, setDone] = useState<ReadonlySet<number>>(new Set());
  if (items.length === 0) return null;

  function toggle(index: number): void {
    setDone((current) => {
      const next = new Set(current);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  return (
    <ReportSection id="checklist" title="Before you sign">
      <p className="muted" aria-live="polite">
        {done.size} of {items.length} checked
      </p>
      <ul className="plain-list checklist" role="list">
        {items.map((item, index) => (
          <li key={item}>
            <label className="checklist__item">
              <input type="checkbox" checked={done.has(index)} onChange={() => toggle(index)} />
              <span>{item}</span>
            </label>
          </li>
        ))}
      </ul>
    </ReportSection>
  );
}
