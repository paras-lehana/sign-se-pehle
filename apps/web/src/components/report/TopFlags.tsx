/**
 * The three most serious red flags, as a preview in the Overview tab.
 *
 * Responsibility: surface what matters most without a tab switch, then offer the full list.
 * Boundary: display only; flags are sorted by severity here, highest first. Titles
 * are not headings here, so the Red flags tab stays the single heading-navigable list.
 */
import type { ReactElement } from 'react';
import type { RedFlag, RiskLevel } from '@sign-se-pehle/core';
import { ReportSection } from './ReportSection';
import { RiskChip } from './RiskChip';

/** A preview, not the list: three flags fit one glance on a phone. */
const PREVIEW_COUNT = 3;

const SEVERITY_ORDER: Readonly<Record<RiskLevel, number>> = { high: 0, medium: 1, low: 2 };

interface TopFlagsProps {
  readonly flags: readonly RedFlag[];
  readonly onShowAll: () => void;
}

export function TopFlags({ flags, onShowAll }: TopFlagsProps): ReactElement | null {
  if (flags.length === 0) return null;
  const top = [...flags]
    .sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity])
    .slice(0, PREVIEW_COUNT);
  return (
    <ReportSection id="top-flags" title="Top red flags">
      <ul className="plain-list top-flags" role="list">
        {top.map((flag) => (
          <li key={flag.ruleId} className={`top-flag severity-edge severity-edge--${flag.severity}`}>
            <RiskChip level={flag.severity} />
            <p className="top-flag__title">{flag.title}</p>
          </li>
        ))}
      </ul>
      <button type="button" className="button button--secondary" onClick={onShowAll}>
        See all {flags.length} red flags
      </button>
    </ReportSection>
  );
}
