/**
 * One clause as an accordion item.
 *
 * Responsibility: show the verified quote (or mark it as a paraphrase), its plain
 * meaning, category and who it favours. Boundary: uses native <details> so the
 * accordion works with keyboard and screen readers without custom ARIA.
 */
import type { ReactElement } from 'react';
import { CATEGORY_LABELS, type Clause, type Favours } from '@sign-se-pehle/core';
import { RiskChip } from './RiskChip';

const FAVOURS_TEXT: Readonly<Record<Favours, string>> = {
  you: 'Favours you',
  'other-party': 'Favours the other party',
  balanced: 'Balanced',
};

interface ClauseItemProps {
  readonly clause: Clause;
}

export function ClauseItem({ clause }: ClauseItemProps): ReactElement {
  return (
    <li className={`clause clause--${clause.risk}`}>
      <details>
        <summary className="clause__summary">
          <span className="clause__heading">{clause.heading}</span>
          <RiskChip level={clause.risk} />
        </summary>
        <div className="clause__body">
          {clause.quoteVerified ? (
            <figure className="clause__quote">
              <blockquote>{clause.quote}</blockquote>
              <figcaption className="badge badge--verified">
                <span aria-hidden="true">{'✓'}</span> <span>Verified in your document</span>
              </figcaption>
            </figure>
          ) : (
            <div className="clause__quote clause__quote--unverified">
              <p>{clause.quote}</p>
              <p className="badge badge--unverified">Paraphrased — not found verbatim</p>
            </div>
          )}
          <p className="clause__meaning">
            <strong>What it means:</strong> {clause.plainMeaning}
          </p>
          <p className="clause__tags">
            <span className="tag">{CATEGORY_LABELS[clause.category]}</span>
            <span className="tag">{FAVOURS_TEXT[clause.favours]}</span>
          </p>
        </div>
      </details>
    </li>
  );
}
