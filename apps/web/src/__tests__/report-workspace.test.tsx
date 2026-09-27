/**
 * Report workspace tests, from core-built fixtures: the heading takes focus, the tab set
 * follows the document kind, every flag / clause / score / provenance renders in its tab,
 * the X-ray opens a clause, and the lazily loaded panels arrive when their tab opens.
 */
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { KIND_PROFILES, type Provenance } from '@sign-se-pehle/core';
import { provenanceText } from '../components/report/ProvenanceBadge';
import { ReportWorkspace } from '../components/report/ReportWorkspace';
import { BAND_LABELS } from '../components/report/ScoreDial';
import { APP_TERMS, buildAnalysis, buildRentalAnalysis } from './fixtures';

const analysis = buildRentalAnalysis();

/** The tab names a reader hears, derived from the same analysis. */
function expectedTabs(hasScenarios: boolean, flags: number, clauses: number): string[] {
  return [
    'Overview',
    `Red flags (${flags})`,
    `Clauses (${clauses})`,
    'Ask',
    ...(hasScenarios ? ['What if'] : []),
    'Next steps',
    'Negotiate',
    'Brief',
  ];
}

const tabNames = (): string[] => screen.getAllByRole('tab').map((tab) => tab.textContent ?? '');

describe('ReportWorkspace', () => {
  it('moves focus to the report heading when results load', () => {
    render(<ReportWorkspace analysis={analysis} />);
    expect(screen.getByRole('heading', { level: 2, name: analysis.title })).toHaveFocus();
  });

  it('offers the eight report views for a rental, and drops What if where no scenario applies', () => {
    const { unmount } = render(<ReportWorkspace analysis={analysis} />);
    expect(tabNames()).toEqual(
      expectedTabs(true, analysis.flags.length, analysis.clauses.length),
    );
    expect(screen.getByRole('tab', { name: 'Overview' })).toHaveAttribute('aria-selected', 'true');
    unmount();
    const terms = buildAnalysis(APP_TERMS, 'online-terms', 'user');
    expect(KIND_PROFILES[terms.kind].scenarios).toHaveLength(0);
    render(<ReportWorkspace analysis={terms} />);
    expect(tabNames()).toEqual(expectedTabs(false, terms.flags.length, terms.clauses.length));
  });

  it('renders the X-ray beside the tabs and a Listen control in the overview', () => {
    render(<ReportWorkspace analysis={analysis} />);
    expect(screen.getByRole('heading', { level: 3, name: 'Document X-ray' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Your document, highlighted by risk' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: 'In short' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Listen to the summary' })).toBeInTheDocument();
  });

  it('renders every red flag with severity text and its official source', async () => {
    expect(analysis.flags.length).toBeGreaterThan(0);
    render(<ReportWorkspace analysis={analysis} />);
    await userEvent.click(screen.getByRole('tab', { name: /^Red flags/ }));
    for (const flag of analysis.flags) {
      const item = screen.getByRole('heading', { level: 4, name: flag.title }).closest('li');
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

  it('jumps from the overview preview to the full red-flag list', async () => {
    render(<ReportWorkspace analysis={analysis} />);
    await userEvent.click(
      screen.getByRole('button', { name: `See all ${analysis.flags.length} red flags` }),
    );
    const flagsTab = screen.getByRole('tab', { name: /^Red flags/ });
    expect(flagsTab).toHaveAttribute('aria-selected', 'true');
    expect(flagsTab).toHaveFocus();
  });

  it('renders every clause and marks verified quotes', async () => {
    render(<ReportWorkspace analysis={analysis} />);
    await userEvent.click(screen.getByRole('tab', { name: /^Clauses/ }));
    const panel = screen.getByRole('tabpanel', { name: /^Clauses/ });
    for (const clause of analysis.clauses) {
      expect(within(panel).getByText(clause.heading, { selector: '.clause__heading' })).toBeVisible();
    }
    const verified = analysis.clauses.filter((clause) => clause.quoteVerified).length;
    expect(within(panel).queryAllByText('Verified in your document')).toHaveLength(verified);
  });

  it('opens, reveals and focuses a clause when its X-ray highlight is tapped', async () => {
    const target = analysis.clauses.find((clause) => clause.quoteVerified && clause.span);
    expect(target).toBeDefined();
    if (target === undefined) return;
    render(<ReportWorkspace analysis={analysis} />);
    await userEvent.click(
      screen.getByRole('button', { name: `Clause: ${target.heading}, ${target.risk} risk` }),
    );
    expect(screen.getByRole('tab', { name: /^Clauses/ })).toHaveAttribute('aria-selected', 'true');
    const details = document.getElementById(`clause-${target.id}`);
    expect(details).toHaveAttribute('open');
    expect(details?.querySelector('summary')).toHaveFocus();
  });

  it('shows the score band as text, not colour alone', () => {
    render(<ReportWorkspace analysis={analysis} />);
    expect(screen.getByText(BAND_LABELS[analysis.score.band])).toBeInTheDocument();
    expect(
      screen.getByRole('img', { name: new RegExp(`Risk score ${analysis.score.value}`) }),
    ).toBeInTheDocument();
  });

  it('shows offline and Gemini provenance', () => {
    const { unmount } = render(<ReportWorkspace analysis={analysis} />);
    expect(screen.getByText(provenanceText(analysis.provenance))).toBeInTheDocument();
    unmount();
    const geminiProvenance: Provenance = {
      mode: 'gemini',
      models: ['gemini-3.5-flash-lite'],
      latencyMs: 3200,
      steps: [],
    };
    render(<ReportWorkspace analysis={{ ...analysis, provenance: geminiProvenance }} />);
    expect(screen.getByText(provenanceText(geminiProvenance))).toHaveTextContent(
      'Explained by Gemini · gemini-3.5-flash-lite',
    );
  });

  it.each([
    ['Next steps', 'Next steps'],
    ['Negotiate', 'Negotiate'],
  ])('loads the %s panel lazily when its tab opens', async (tabName, heading) => {
    render(<ReportWorkspace analysis={analysis} />);
    expect(screen.queryByRole('heading', { level: 3, name: heading })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('tab', { name: tabName }));
    expect(await screen.findByRole('heading', { level: 3, name: heading })).toBeInTheDocument();
  });

  it('puts the checklist, lawyer questions and the printable brief in the Brief tab', async () => {
    render(<ReportWorkspace analysis={analysis} />);
    await userEvent.click(screen.getByRole('tab', { name: 'Brief' }));
    expect(await screen.findByRole('button', { name: /Download brief/ })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: 'Before you sign' })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 3, name: 'Questions to ask a lawyer' }),
    ).toBeInTheDocument();
  });
});
