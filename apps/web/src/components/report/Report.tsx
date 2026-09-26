/**
 * The full report for one analysed document.
 *
 * Responsibility: lay out every report section in reading order and move focus to
 * the report heading when it appears. Boundary: each section is its own component;
 * this file only composes them and never reformats analysis data.
 */
import { type ReactElement, useEffect, useRef } from 'react';
import { KIND_PROFILES, LANGUAGES, ROLE_LABELS } from '@sign-se-pehle/core';
import type { Analysis } from '../../lib/api';
import { AskPanel } from './AskPanel';
import { Checklist } from './Checklist';
import { Clauses } from './Clauses';
import { Inconsistencies } from './Inconsistencies';
import { KeyDates } from './KeyDates';
import { LawyerQuestions } from './LawyerQuestions';
import { MoneyAtStake } from './MoneyAtStake';
import { Obligations } from './Obligations';
import { ProvenanceBadge } from './ProvenanceBadge';
import { RedFlags } from './RedFlags';
import { SummarySection } from './SummarySection';
import { WhatIfPanel } from './WhatIfPanel';

interface ReportProps {
  readonly analysis: Analysis;
}

export function Report({ analysis }: ReportProps): ReactElement {
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, [analysis.id]);

  const redactedTotal = analysis.document.redactions.reduce((sum, item) => sum + item.count, 0);

  return (
    <article className="report" aria-labelledby="report-heading">
      <header className="report__header">
        <h2 id="report-heading" ref={headingRef} tabIndex={-1}>
          {analysis.title}
        </h2>
        <p className="report__meta">
          {KIND_PROFILES[analysis.kind].label} · Read as: {ROLE_LABELS[analysis.role]} · Explained
          in {LANGUAGES[analysis.language].englishName}
        </p>
        <ProvenanceBadge provenance={analysis.provenance} />
        {redactedTotal > 0 ? (
          <p className="report__privacy">
            {redactedTotal} personal {redactedTotal === 1 ? 'detail was' : 'details were'} masked
            before analysis.
          </p>
        ) : null}
      </header>
      <SummarySection summary={analysis.summary} score={analysis.score} />
      <RedFlags flags={analysis.flags} />
      <MoneyAtStake money={analysis.moneyAtStake} />
      <Clauses clauses={analysis.clauses} />
      <KeyDates keyDates={analysis.keyDates} documentTitle={analysis.title} />
      <Obligations obligations={analysis.obligations} />
      <Inconsistencies items={analysis.inconsistencies} />
      <WhatIfPanel kind={analysis.kind} facts={analysis.facts} />
      <AskPanel analysis={analysis} />
      <Checklist items={analysis.checklist} />
      <LawyerQuestions questions={analysis.lawyerQuestions} />
    </article>
  );
}
