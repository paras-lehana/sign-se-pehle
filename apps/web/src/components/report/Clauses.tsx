/**
 * Every clause, explained, as an accordion list.
 *
 * Responsibility: list clauses in document order with a verified-quote count so the
 * reader knows how much of the explanation is anchored in their text. Boundary: display only.
 */
import type { ReactElement } from 'react';
import type { Clause } from '@sign-se-pehle/core';
import { ClauseItem } from './ClauseItem';
import { ReportSection } from './ReportSection';

interface ClausesProps {
  readonly clauses: readonly Clause[];
}

export function Clauses({ clauses }: ClausesProps): ReactElement {
  const verified = clauses.filter((clause) => clause.quoteVerified).length;
  return (
    <ReportSection
      id="clauses"
      title={`Every clause, explained (${clauses.length})`}
      intro={`${verified} of ${clauses.length} quotes were found word for word in your document. Tap a clause to open it.`}
    >
      <ul className="plain-list clause-list" role="list">
        {clauses.map((clause) => (
          <ClauseItem key={clause.id} clause={clause} />
        ))}
      </ul>
    </ReportSection>
  );
}
