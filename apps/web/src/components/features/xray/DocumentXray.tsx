/**
 * Document X-ray: the reader's own document with every located clause painted by risk.
 *
 * Responsibility: show the analysed (PII-redacted) text exactly as written, highlight
 * each verified clause in its risk colour, count them, and let the reader jump to a
 * clause's explanation. Boundary: segmentation is core's segmentByClauses (verified
 * spans only); opening the clause is the parent's job via `onSelectClause`.
 */
import { Fragment, type ReactElement, useMemo, useState } from 'react';
import { type Analysis, type RiskLevel, segmentByClauses } from '@sign-se-pehle/core';
import { XrayLegend } from './XrayLegend';
import { XrayMark } from './XrayMark';

interface DocumentXrayProps {
  readonly analysis: Analysis;
  readonly onSelectClause: (clauseId: string) => void;
}

/**
 * The document box scrolls on its own, so it must be reachable by keyboard even when it
 * has no highlight buttons (WCAG 2.1.1; axe rule scrollable-region-focusable).
 */
const SCROLL_REGION_TAB_INDEX = 0;

function countClausesByRisk(
  segments: readonly { readonly clauseId?: string; readonly risk?: RiskLevel }[],
): Record<RiskLevel, number> {
  const seen = new Map<string, RiskLevel>();
  for (const segment of segments) {
    if (
      segment.clauseId !== undefined &&
      segment.risk !== undefined &&
      !seen.has(segment.clauseId)
    ) {
      seen.set(segment.clauseId, segment.risk);
    }
  }
  const counts: Record<RiskLevel, number> = { high: 0, medium: 0, low: 0 };
  for (const risk of seen.values()) counts[risk] += 1;
  return counts;
}

export function DocumentXray({ analysis, onSelectClause }: DocumentXrayProps): ReactElement {
  const { text } = analysis.document;
  const segments = useMemo(
    () => segmentByClauses(text, analysis.clauses),
    [text, analysis.clauses],
  );
  const headings = useMemo(
    () => new Map(analysis.clauses.map((clause) => [clause.id, clause.heading])),
    [analysis.clauses],
  );
  const [activeId, setActiveId] = useState<string | null>(null);
  const counts = countClausesByRisk(segments);
  const unlocated = analysis.clauses.filter(
    (clause) => !clause.quoteVerified || clause.span === undefined,
  ).length;
  const labelled = new Set<string>();

  function select(clauseId: string): void {
    setActiveId(clauseId);
    onSelectClause(clauseId);
  }

  return (
    <section className="card xray" aria-labelledby="xray-heading">
      <div className="xray__head">
        <h3 id="xray-heading">Document X-ray</h3>
        <p className="xray__hint">Tap a highlight to see what it means.</p>
      </div>
      <XrayLegend counts={counts} />
      {text.trim().length === 0 ? (
        <p className="muted">The document text is not available to highlight.</p>
      ) : (
        <div
          className="xray__doc"
          role="region"
          aria-label="Your document, highlighted by risk"
          tabIndex={SCROLL_REGION_TAB_INDEX}
        >
          {segments.map((segment) => {
            const { clauseId, risk } = segment;
            if (clauseId === undefined || risk === undefined) {
              return <Fragment key={segment.start}>{segment.text}</Fragment>;
            }
            const showButton = !labelled.has(clauseId);
            labelled.add(clauseId);
            return (
              <XrayMark
                key={segment.start}
                clauseId={clauseId}
                heading={headings.get(clauseId) ?? 'Clause'}
                risk={risk}
                text={segment.text}
                showButton={showButton}
                active={clauseId === activeId}
                onSelect={select}
              />
            );
          })}
        </div>
      )}
      {unlocated > 0 ? (
        <p className="field__hint">
          {unlocated === 1 ? '1 clause was' : `${unlocated} clauses were`} explained in other words
          and could not be matched word for word, so {unlocated === 1 ? 'it is' : 'they are'} listed
          under Clauses only.
        </p>
      ) : null}
    </section>
  );
}
