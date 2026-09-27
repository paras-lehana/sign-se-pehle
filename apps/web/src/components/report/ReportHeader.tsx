/**
 * The report's title card: heading, what was read and how, provenance, privacy and score.
 *
 * Responsibility: context that stays visible above every tab, and the focus target when a
 * report arrives. Boundary: display only; it sits outside the tabs on purpose so the h2
 * (and the h3s under it) never disappear when a reader switches tab.
 */
import { type ReactElement, useEffect, useRef } from 'react';
import { KIND_PROFILES, LANGUAGES, ROLE_LABELS } from '@sign-se-pehle/core';
import type { Analysis } from '../../lib/api';
import { Icon } from '../ui/Icon';
import { ProvenanceBadge } from './ProvenanceBadge';
import { ScoreDial } from './ScoreDial';

interface ReportHeaderProps {
  readonly analysis: Analysis;
}

export function ReportHeader({ analysis }: ReportHeaderProps): ReactElement {
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, [analysis.id]);

  const redactedTotal = analysis.document.redactions.reduce((sum, item) => sum + item.count, 0);

  return (
    <header className="report-header glass glass--blur">
      <div className="report-header__text">
        <p className="eyebrow">Your report</p>
        <h2 id="report-heading" ref={headingRef} tabIndex={-1}>
          {analysis.title}
        </h2>
        <ul className="plain-list report-header__meta" role="list" aria-label="About this report">
          <li className="pill">{KIND_PROFILES[analysis.kind].label}</li>
          <li className="pill">Read as: {ROLE_LABELS[analysis.role]}</li>
          <li className="pill">Explained in {LANGUAGES[analysis.language].englishName}</li>
        </ul>
        <div className="report-header__trust">
          <ProvenanceBadge provenance={analysis.provenance} />
          {redactedTotal > 0 ? (
            <p className="report-header__privacy">
              <Icon name="shield" className="report-header__privacy-icon" />
              {redactedTotal} personal {redactedTotal === 1 ? 'detail was' : 'details were'} masked
              before analysis.
            </p>
          ) : null}
        </div>
      </div>
      <ScoreDial score={analysis.score} />
    </header>
  );
}
