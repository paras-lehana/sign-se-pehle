/**
 * Overview tab: summary with Listen, top red flags, money at stake, key dates and anything
 * that does not add up.
 *
 * Responsibility: the one-screen digest of a report. Boundary: composition only; each part
 * is its own component and hides itself when it has nothing to show.
 */
import type { ReactElement } from 'react';
import type { Analysis } from '../../lib/api';
import { Inconsistencies } from './Inconsistencies';
import { KeyDates } from './KeyDates';
import { MoneyAtStake } from './MoneyAtStake';
import { SummarySection } from './SummarySection';
import { TopFlags } from './TopFlags';

interface OverviewPanelProps {
  readonly analysis: Analysis;
  readonly onShowFlags: () => void;
}

export function OverviewPanel({ analysis, onShowFlags }: OverviewPanelProps): ReactElement {
  return (
    <div className="panel-stack">
      <SummarySection summary={analysis.summary} score={analysis.score} language={analysis.language} />
      <TopFlags flags={analysis.flags} onShowAll={onShowFlags} />
      <MoneyAtStake money={analysis.moneyAtStake} />
      <KeyDates keyDates={analysis.keyDates} documentTitle={analysis.title} />
      <Inconsistencies items={analysis.inconsistencies} />
    </div>
  );
}
