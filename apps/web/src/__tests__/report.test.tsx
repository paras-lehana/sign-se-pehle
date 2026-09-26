/**
 * Report tests: flags, clauses, score and provenance rendered from a core-built fixture.
 */
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { Provenance } from '@sign-se-pehle/core';
import { Report } from '../components/report/Report';
import { provenanceText } from '../components/report/ProvenanceBadge';
import { BAND_LABELS } from '../components/report/ScoreDial';
import { buildRentalAnalysis } from './fixtures';

describe('Report', () => {
  const analysis = buildRentalAnalysis();

  it('moves focus to the report heading when results load', () => {
    render(<Report analysis={analysis} />);
    expect(screen.getByRole('heading', { level: 2, name: analysis.title })).toHaveFocus();
  });

  it('renders every red flag with severity text and its official source', () => {
    expect(analysis.flags.length).toBeGreaterThan(0);
    render(<Report analysis={analysis} />);
    for (const flag of analysis.flags) {
      const title = screen.getByRole('heading', { level: 4, name: flag.title });
      const item = title.closest('li');
      expect(item).not.toBeNull();
      if (item === null) continue;
      expect(within(item).getByText(/(High|Medium|Low) risk$/)).toBeInTheDocument();
      if (flag.law !== undefined) {
        expect(
          within(item).getByRole('link', {
            name: (name) => name.startsWith(`Source: ${flag.law?.act ?? ''}`),
          }),
        ).toHaveAttribute('href', flag.law.url);
      }
    }
  });

  it('renders every clause and marks verified quotes', () => {
    render(<Report analysis={analysis} />);
    for (const clause of analysis.clauses) {
      expect(screen.getAllByText(clause.heading).length).toBeGreaterThan(0);
    }
    const verified = analysis.clauses.filter((clause) => clause.quoteVerified).length;
    expect(screen.queryAllByText('Verified in your document')).toHaveLength(verified);
  });

  it('shows the score band as text, not colour alone', () => {
    render(<Report analysis={analysis} />);
    expect(screen.getByText(BAND_LABELS[analysis.score.band])).toBeInTheDocument();
    expect(
      screen.getByRole('img', { name: new RegExp(`Risk score ${analysis.score.value}`) }),
    ).toBeInTheDocument();
  });

  it('shows offline and Gemini provenance', () => {
    const { unmount } = render(<Report analysis={analysis} />);
    expect(screen.getByText(provenanceText(analysis.provenance))).toBeInTheDocument();
    unmount();
    const geminiProvenance: Provenance = {
      mode: 'gemini',
      models: ['gemini-3.5-flash-lite'],
      latencyMs: 3200,
      steps: [],
    };
    const gemini = { ...analysis, provenance: geminiProvenance };
    render(<Report analysis={gemini} />);
    expect(screen.getByText(provenanceText(gemini.provenance))).toHaveTextContent(
      'Explained by Gemini · gemini-3.5-flash-lite',
    );
  });
});
