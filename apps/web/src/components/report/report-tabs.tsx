/**
 * The report's tab set: ids, labels (with counts) and the panel behind each tab.
 *
 * Responsibility: one table that decides which views a report has and in what order.
 * Boundary: a pure builder (no state) used by ReportWorkspace; What if is left out for
 * document kinds without scenarios, and the heavier panels load lazily in Suspense.
 */
import { Suspense } from 'react';
import { KIND_PROFILES } from '@sign-se-pehle/core';
import type { Analysis } from '../../lib/api';
import { LoadingFallback } from '../ui/LoadingFallback';
import { TabCount } from '../ui/TabCount';
import type { TabItem } from '../ui/Tabs';
import { AskPanel } from './AskPanel';
import { BriefPanel } from './BriefPanel';
import { Clauses } from './Clauses';
import { LazyNegotiatePanel, LazyNextStepsPanel } from './lazy-panels';
import { Obligations } from './Obligations';
import { OverviewPanel } from './OverviewPanel';
import { RedFlags } from './RedFlags';
import { WhatIfPanel } from './WhatIfPanel';

export const REPORT_TAB_IDS = [
  'overview',
  'flags',
  'clauses',
  'ask',
  'whatif',
  'next',
  'negotiate',
  'brief',
] as const;

export type ReportTabId = (typeof REPORT_TAB_IDS)[number];

interface ReportTabsInput {
  readonly analysis: Analysis;
  /** The clause the X-ray asked to open, if any. */
  readonly openClauseId: string | undefined;
  readonly onShowFlags: () => void;
}

export function buildReportTabs({
  analysis,
  openClauseId,
  onShowFlags,
}: ReportTabsInput): readonly TabItem[] {
  const hasScenarios = KIND_PROFILES[analysis.kind].scenarios.length > 0;
  const tabs: readonly (TabItem | null)[] = [
    {
      id: 'overview',
      label: 'Overview',
      panel: <OverviewPanel analysis={analysis} onShowFlags={onShowFlags} />,
    },
    {
      id: 'flags',
      label: (
        <>
          Red flags
          <TabCount value={analysis.flags.length} />
        </>
      ),
      panel: <RedFlags flags={analysis.flags} />,
    },
    {
      id: 'clauses',
      label: (
        <>
          Clauses
          <TabCount value={analysis.clauses.length} />
        </>
      ),
      panel: (
        <div className="panel-stack">
          <Clauses clauses={analysis.clauses} openClauseId={openClauseId} />
          <Obligations obligations={analysis.obligations} />
        </div>
      ),
    },
    { id: 'ask', label: 'Ask', panel: <AskPanel analysis={analysis} /> },
    hasScenarios
      ? {
          id: 'whatif',
          label: 'What if',
          panel: <WhatIfPanel kind={analysis.kind} facts={analysis.facts} />,
        }
      : null,
    {
      id: 'next',
      label: 'Next steps',
      panel: (
        <Suspense fallback={<LoadingFallback label="Loading next steps…" />}>
          <LazyNextStepsPanel analysis={analysis} />
        </Suspense>
      ),
    },
    {
      id: 'negotiate',
      label: 'Negotiate',
      panel: (
        <Suspense fallback={<LoadingFallback label="Loading the negotiation helper…" />}>
          <LazyNegotiatePanel analysis={analysis} />
        </Suspense>
      ),
    },
    { id: 'brief', label: 'Brief', panel: <BriefPanel analysis={analysis} /> },
  ];
  return tabs.filter((tab): tab is TabItem => tab !== null);
}
