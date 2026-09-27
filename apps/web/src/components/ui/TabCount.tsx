/**
 * A count badge inside a tab label, e.g. "Red flags (5)".
 *
 * Responsibility: show the number as a pill while screen readers hear "(5)" as part of the
 * tab's name. Boundary: presentation only.
 */
import type { ReactElement } from 'react';

interface TabCountProps {
  readonly value: number;
}

export function TabCount({ value }: TabCountProps): ReactElement {
  return (
    <span className="tabs__count">
      <span className="visually-hidden"> (</span>
      {value}
      <span className="visually-hidden">)</span>
    </span>
  );
}
