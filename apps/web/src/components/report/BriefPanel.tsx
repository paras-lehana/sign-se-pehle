/**
 * Brief tab: the before-you-sign checklist, questions for a lawyer and the printable brief.
 *
 * Responsibility: everything a reader takes to a lawyer or legal aid visit. Boundary:
 * composition only; the printable brief is loaded lazily with this tab.
 */
import { type ReactElement, Suspense } from 'react';
import type { Analysis } from '../../lib/api';
import { LoadingFallback } from '../ui/LoadingFallback';
import { Checklist } from './Checklist';
import { LawyerQuestions } from './LawyerQuestions';
import { LazyLawyerBrief } from './lazy-panels';

interface BriefPanelProps {
  readonly analysis: Analysis;
}

export function BriefPanel({ analysis }: BriefPanelProps): ReactElement {
  return (
    <div className="panel-stack">
      <Suspense fallback={<LoadingFallback label="Loading the brief…" />}>
        <LazyLawyerBrief analysis={analysis} />
      </Suspense>
      <Checklist items={analysis.checklist} />
      <LawyerQuestions questions={analysis.lawyerQuestions} />
    </div>
  );
}
