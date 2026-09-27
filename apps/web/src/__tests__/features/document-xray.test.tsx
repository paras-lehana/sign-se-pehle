/**
 * DocumentXray: the reader's text painted by clause risk from core's segmentation, with
 * a counted legend and a labelled button per located clause.
 */
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { type RiskLevel, segmentByClauses } from '@sign-se-pehle/core';
import { DocumentXray } from '../../components/features/xray/DocumentXray';
import { buildSampleAnalysis } from './feature-fixtures';

const RISK_WORD: Readonly<Record<RiskLevel, string>> = {
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

describe('DocumentXray', () => {
  const analysis = buildSampleAnalysis('rent-leave-licence');
  const segments = segmentByClauses(analysis.document.text, analysis.clauses);
  const highlighted = [
    ...new Map(
      segments.flatMap((segment) =>
        segment.clauseId === undefined || segment.risk === undefined
          ? []
          : [[segment.clauseId, segment.risk] as const],
      ),
    ),
  ];

  it('labels one button per located clause with its heading and risk', () => {
    expect(highlighted.length).toBeGreaterThan(0);
    render(<DocumentXray analysis={analysis} onSelectClause={vi.fn()} />);
    for (const [clauseId, risk] of highlighted) {
      const heading = analysis.clauses.find((clause) => clause.id === clauseId)?.heading ?? '';
      expect(
        screen.getByRole('button', { name: `Clause: ${heading}, ${risk} risk` }),
      ).toBeInTheDocument();
    }
    expect(screen.getByText('Tap a highlight to see what it means.')).toBeInTheDocument();
  });

  it('shows the whole document text in reading order', () => {
    render(<DocumentXray analysis={analysis} onSelectClause={vi.fn()} />);
    const region = screen.getByRole('region', { name: 'Your document, highlighted by risk' });
    for (const segment of segments) expect(region.textContent).toContain(segment.text);
  });

  it('counts clauses per risk level in the legend, in words', () => {
    render(<DocumentXray analysis={analysis} onSelectClause={vi.fn()} />);
    const legend = screen.getByRole('list', { name: 'Highlight colours' });
    for (const level of ['high', 'medium', 'low'] as const) {
      const count = highlighted.filter(([, risk]) => risk === level).length;
      expect(within(legend).getByText(RISK_WORD[level], { exact: false })).toHaveTextContent(
        `${RISK_WORD[level]} (${count})`,
      );
    }
    expect(within(legend).getByText('No issue')).toBeInTheDocument();
  });

  it('asks the parent to open a clause and marks it active', async () => {
    const user = userEvent.setup();
    const onSelectClause = vi.fn();
    const [target] = highlighted;
    if (target === undefined) throw new Error('No highlighted clause');
    render(<DocumentXray analysis={analysis} onSelectClause={onSelectClause} />);
    const heading = analysis.clauses.find((clause) => clause.id === target[0])?.heading ?? '';
    const button = screen.getByRole('button', { name: `Clause: ${heading}, ${target[1]} risk` });

    await user.click(button);

    expect(onSelectClause).toHaveBeenCalledWith(target[0]);
    expect(button.closest('mark')).toHaveClass('xray-mark--active');
  });

  it('explains clauses it could not locate word for word', () => {
    const paraphrased = {
      ...analysis,
      clauses: analysis.clauses.map((clause, index) =>
        index === 0 ? { ...clause, quoteVerified: false } : clause,
      ),
    };
    render(<DocumentXray analysis={paraphrased} onSelectClause={vi.fn()} />);
    expect(screen.getByText(/1 clause was explained in other words/)).toBeInTheDocument();
  });

  it('says so when there is no text to highlight', () => {
    const empty = { ...analysis, document: { ...analysis.document, text: '' } };
    render(<DocumentXray analysis={empty} onSelectClause={vi.fn()} />);
    expect(
      screen.getByText('The document text is not available to highlight.'),
    ).toBeInTheDocument();
  });
});
