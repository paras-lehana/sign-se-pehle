/**
 * The report workspace: title card, then the Document X-ray beside the report tabs.
 *
 * Responsibility: own which tab is showing and connect the X-ray to the Clauses tab —
 * tapping a highlight switches to Clauses, opens that clause, scrolls to it and moves
 * focus to it. Boundary: layout (sticky two columns ≥ 1100 px, stacked below) is CSS;
 * the tab set lives in report-tabs.tsx. Remount with `key={analysis.id}` for a new report.
 */
import { type ReactElement, useEffect, useState } from 'react';
import { flushSync } from 'react-dom';
import type { Analysis } from '../../lib/api';
import { Tabs } from '../ui/Tabs';
import { ReportHeader } from './ReportHeader';
import { REPORT_TAB_IDS, type ReportTabId, buildReportTabs } from './report-tabs';
import { XrayColumn } from './XrayColumn';

interface ReportWorkspaceProps {
  readonly analysis: Analysis;
}

/** A request to reveal a clause; `seq` makes a repeat tap on the same clause count. */
interface ClauseRequest {
  readonly clauseId: string;
  readonly seq: number;
}

function prefersReducedMotion(): boolean {
  return (
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/** Opens the clause's <details>, scrolls it into view and focuses its summary. */
function revealClause(clauseId: string): void {
  const target = document.getElementById(`clause-${clauseId}`);
  if (!(target instanceof HTMLDetailsElement)) return;
  target.open = true;
  target.querySelector('summary')?.focus({ preventScroll: true });
  target.scrollIntoView?.({ block: 'center', behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
}

export function ReportWorkspace({ analysis }: ReportWorkspaceProps): ReactElement {
  const [tab, setTab] = useState<ReportTabId>('overview');
  const [request, setRequest] = useState<ClauseRequest | null>(null);

  useEffect(() => {
    if (request !== null) revealClause(request.clauseId);
  }, [request]);

  function selectClause(clauseId: string): void {
    setTab('clauses');
    setRequest((previous) => ({ clauseId, seq: (previous?.seq ?? 0) + 1 }));
  }

  function showFlags(): void {
    // The button that asked lives in the panel being hidden, so focus follows to the tab.
    flushSync(() => setTab('flags'));
    document.getElementById('report-tab-flags')?.focus();
  }

  const items = buildReportTabs({ analysis, openClauseId: request?.clauseId, onShowFlags: showFlags });

  return (
    <article className="report" aria-labelledby="report-heading">
      <ReportHeader analysis={analysis} />
      <div className="report-workspace">
        <XrayColumn analysis={analysis} onSelectClause={selectClause} />
        <Tabs
          idPrefix="report"
          label="Report sections"
          className="report-tabs"
          items={items}
          selectedId={tab}
          onSelect={(id) => setTab(REPORT_TAB_IDS.find((known) => known === id) ?? tab)}
        />
      </div>
    </article>
  );
}
