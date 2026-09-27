/**
 * Every clause, explained, as an accordion list.
 *
 * Responsibility: list clauses in document order with a verified-quote count so the
 * reader knows how much of the explanation is anchored in their text. Boundary: display
 * only; which clause is open on request is decided by the report workspace.
 */
import type { ReactElement } from 'react';
import type { Clause } from '@sign-se-pehle/core';
import { ClauseItem } from './ClauseItem';
import { ReportSection } from './ReportSection';

interface ClausesProps {
  readonly clauses: readonly Clause[];
  /** The clause the X-ray asked to open, if any. */
  readonly openClauseId?: string | undefined;
}

export function Clauses({ clauses, openClauseId }: ClausesProps): ReactElement {
  const verified = clauses.filter((clause) => clause.quoteVerified).length;
  return (
    <ReportSection
      id="clauses"
      title={`Every clause, explained (${clauses.length})`}
      intro={`${verified} of ${clauses.length} quotes were found word for word in your document. Tap a clause to open it; tap a legal term inside for its plain meaning.`}
    >
      <ul className="plain-list clause-list" role="list">
        {clauses.map((clause) => (
          <ClauseItem key={clause.id} clause={clause} open={clause.id === openClauseId} />
        ))}
      </ul>
    </ReportSection>
  );
}
