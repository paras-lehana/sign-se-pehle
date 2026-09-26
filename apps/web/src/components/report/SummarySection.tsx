/**
 * Report summary: one-line gist, key points and the Kavach score.
 *
 * Responsibility: the first thing a reader sees after analysis. Boundary: display only.
 */
import type { ReactElement } from 'react';
import type { KavachScore } from '@sign-se-pehle/core';
import type { Analysis } from '../../lib/api';
import { ReportSection } from './ReportSection';
import { ScoreDial } from './ScoreDial';

interface SummarySectionProps {
  readonly summary: Analysis['summary'];
  readonly score: KavachScore;
}

export function SummarySection({ summary, score }: SummarySectionProps): ReactElement {
  return (
    <ReportSection id="summary" title="In short">
      <div className="summary">
        <div className="summary__text">
          <p className="summary__one-line">{summary.oneLine}</p>
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
        </div>
        <ScoreDial score={score} />
      </div>
    </ReportSection>
  );
}
