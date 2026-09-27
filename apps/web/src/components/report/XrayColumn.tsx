/**
 * The report's left column: the Document X-ray, sticky beside the tabs on wide screens and
 * a collapsible section above them on phones.
 *
 * Responsibility: place DocumentXray responsively. Boundary: one <details> element serves
 * both layouts — at ≥ 1100 px it is held open and its summary is hidden (the column is
 * always visible); below that it starts closed so the tabs stay near the top.
 */
import type { ReactElement } from 'react';
import type { Analysis } from '../../lib/api';
import { DocumentXray } from '../features/xray/DocumentXray';
import { useMediaQuery } from '../ui/use-media-query';

/** Matches the two-column breakpoint in report.css. */
export const WIDE_REPORT_QUERY = '(min-width: 1100px)';

interface XrayColumnProps {
  readonly analysis: Analysis;
  readonly onSelectClause: (clauseId: string) => void;
}

export function XrayColumn({ analysis, onSelectClause }: XrayColumnProps): ReactElement {
  const wide = useMediaQuery(WIDE_REPORT_QUERY);
  return (
    <details className="xray-column" open={wide}>
      <summary className="xray-column__summary">
        <span>Document X-ray</span>
        <span className="xray-column__hint">Your text, highlighted by risk</span>
      </summary>
      <div className="xray-column__body">
        <DocumentXray analysis={analysis} onSelectClause={onSelectClause} />
      </div>
    </details>
  );
}
