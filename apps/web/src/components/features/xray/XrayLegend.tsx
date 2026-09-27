/**
 * X-ray legend with a count per risk level.
 *
 * Responsibility: say in words (and a shape icon) what each highlight colour means and
 * how many clauses carry it. Boundary: display only; counting happens in DocumentXray.
 */
import type { ReactElement } from 'react';
import { RISK_LEVELS, type RiskLevel } from '@sign-se-pehle/core';
import { RISK_ICONS, RISK_WORDS } from '../common/risk';

interface XrayLegendProps {
  readonly counts: Readonly<Record<RiskLevel, number>>;
}

export function XrayLegend({ counts }: XrayLegendProps): ReactElement {
  return (
    <ul className="plain-list xray-legend" role="list" aria-label="Highlight colours">
      {RISK_LEVELS.map((level) => (
        <li key={level} className={`xray-legend__item xray-legend__item--${level}`}>
          <span className="xray-legend__swatch" aria-hidden="true">
            {RISK_ICONS[level]}
          </span>
          {RISK_WORDS[level]} <span className="xray-legend__count">({counts[level]})</span>
        </li>
      ))}
      <li className="xray-legend__item xray-legend__item--none">
        <span className="xray-legend__swatch" aria-hidden="true" />
        No issue
      </li>
    </ul>
  );
}
