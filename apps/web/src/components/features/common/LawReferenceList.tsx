/**
 * A list of official law references with links.
 *
 * Responsibility: show which curated Indian-law entries a feature relies on, each linked
 * to its official government or court page. Boundary: references always come from core's
 * curated LAWS table (directly or via the server); this component never invents one.
 */
import type { ReactElement } from 'react';
import type { LawReference } from '@sign-se-pehle/core';

interface LawReferenceListProps {
  readonly title: string;
  readonly references: readonly LawReference[];
}

export function LawReferenceList({
  title,
  references,
}: LawReferenceListProps): ReactElement | null {
  if (references.length === 0) return null;
  return (
    <div className="law-refs">
      <h4 className="law-refs__title">{title}</h4>
      <ul className="plain-list law-refs__list" role="list">
        {references.map((reference) => (
          <li key={reference.id} className="law-refs__item">
            <a href={reference.url} target="_blank" rel="noopener noreferrer">
              {reference.act}, {reference.section}
              <span className="visually-hidden"> (opens official site in a new tab)</span>
            </a>
            <span className="law-refs__summary">{reference.summary}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
