/**
 * Severity chip: icon + text + colour, so risk is never conveyed by colour alone.
 *
 * Responsibility: one presentation of a RiskLevel. Boundary: display only.
 */
import type { ReactElement } from 'react';
import type { RiskLevel } from '@sign-se-pehle/core';

const RISK_TEXT: Readonly<Record<RiskLevel, string>> = {
  high: 'High risk',
  medium: 'Medium risk',
  low: 'Low risk',
};

const RISK_ICON: Readonly<Record<RiskLevel, string>> = {
  high: '⚠',
  medium: '◆',
  low: 'ℹ',
};

interface RiskChipProps {
  readonly level: RiskLevel;
}

export function RiskChip({ level }: RiskChipProps): ReactElement {
  return (
    <span className={`chip chip--${level}`}>
      <span aria-hidden="true">{RISK_ICON[level]}</span> {RISK_TEXT[level]}
    </span>
  );
}
