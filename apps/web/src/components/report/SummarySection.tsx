/**
 * Report summary: the one-line gist, key points, why the score is what it is, and Listen.
 *
 * Responsibility: the first thing a reader sees in the Overview tab. Boundary: display
 * only; the score ring itself lives in the report header so it stays visible across tabs.
 */
import type { ReactElement } from 'react';
import type { LanguageCode, RiskScore } from '@sign-se-pehle/core';
import type { Analysis } from '../../lib/api';
import { ListenButton } from '../features/listen/ListenButton';
import { ReportSection } from './ReportSection';

interface SummarySectionProps {
  readonly summary: Analysis['summary'];
  readonly score: RiskScore;
  readonly language: LanguageCode;
}

/** What Listen reads aloud: the gist, then each key point as its own sentence. */
export function summarySpeech(summary: Analysis['summary']): string {
  return [summary.oneLine, ...summary.keyPoints].join(' ');
}

export function SummarySection({ summary, score, language }: SummarySectionProps): ReactElement {
  return (
    <ReportSection id="summary" title="In short">
      <p className="summary__one-line">{summary.oneLine}</p>
      <div className="summary__listen">
        <ListenButton text={summarySpeech(summary)} language={language} label="Listen to the summary" />
      </div>
      {summary.keyPoints.length > 0 ? (
        <ul className="summary__points">
          {summary.keyPoints.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ul>
      ) : null}
      {score.reasons.length > 0 ? (
        <p className="summary__reasons">
          <strong>Why this score:</strong> {score.reasons.join('; ')}
        </p>
      ) : null}
    </ReportSection>
  );
}
