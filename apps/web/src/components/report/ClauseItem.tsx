/**
 * One clause as an accordion item with a severity edge.
 *
 * Responsibility: show the verified quote (or mark it as a paraphrase), its plain meaning
 * with glossary pop-ups, category and who it favours. Boundary: native <details> keeps the
 * accordion keyboard- and screen-reader-friendly without custom ARIA; its id
 * `clause-<id>` and the `open` prop let the Document X-ray open a clause from outside.
 */
import type { ReactElement } from 'react';
import { CATEGORY_LABELS, type Clause, type Favours } from '@sign-se-pehle/core';
import { GlossaryText } from '../features/glossary/GlossaryText';
import { RiskChip } from './RiskChip';

const FAVOURS_TEXT: Readonly<Record<Favours, string>> = {
  you: 'Favours you',
  'other-party': 'Favours the other party',
  balanced: 'Balanced',
};

interface ClauseItemProps {
  readonly clause: Clause;
  /** True when the X-ray asked for this clause. */
  readonly open: boolean;
}

export function ClauseItem({ clause, open }: ClauseItemProps): ReactElement {
  return (
    <li className={`clause severity-edge severity-edge--${clause.risk}`}>
      <details id={`clause-${clause.id}`} open={open}>
        <summary className="clause__summary">
          <span className="clause__heading">{clause.heading}</span>
          <RiskChip level={clause.risk} />
        </summary>
        <div className="clause__body">
          {clause.quoteVerified ? (
            <figure className="clause__quote">
              <blockquote>
                <GlossaryText text={clause.quote} />
              </blockquote>
              <figcaption className="badge badge--verified">
                <span aria-hidden="true">{'✓'}</span> <span>Verified in your document</span>
              </figcaption>
            </figure>
          ) : (
            <div className="clause__quote clause__quote--unverified">
              <p>
                <GlossaryText text={clause.quote} />
              </p>
              <p className="badge badge--unverified">Paraphrased — not found verbatim</p>
            </div>
          )}
          <p className="clause__meaning">
            <strong>What it means:</strong> <GlossaryText text={clause.plainMeaning} />
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
