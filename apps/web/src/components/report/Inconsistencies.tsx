/**
 * Inconsistencies: mismatched amounts and contradictory terms.
 *
 * Responsibility: list problems found by deterministic checks or spotted by Gemini,
 * labelled by source so readers know which are rule-verified. Boundary: display only.
 */
import type { ReactElement } from 'react';
import type { Inconsistency } from '@sign-se-pehle/core';
import { ReportSection } from './ReportSection';

const SOURCE_TEXT: Readonly<Record<Inconsistency['source'], string>> = {
  rule: 'Found by our checks',
  ai: 'Spotted by Gemini',
};

interface InconsistenciesProps {
  readonly items: readonly Inconsistency[];
}

export function Inconsistencies({ items }: InconsistenciesProps): ReactElement | null {
  if (items.length === 0) return null;
  return (
    <ReportSection
      id="inconsistencies"
      title="Things that do not add up"
      intro="Ask for these to be corrected before signing."
    >
      <ul className="plain-list issue-list" role="list">
        {items.map((item) => (
          <li key={item.description} className="issue">
            <span className="tag">{SOURCE_TEXT[item.source]}</span> {item.description}
          </li>
        ))}
      </ul>
    </ReportSection>
  );
}
