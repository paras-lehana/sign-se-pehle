/**
 * LawyerBrief: prints a one-page brief through the browser (print class + portal around
 * window.print) and shares only flag titles and questions on WhatsApp.
 */
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { buildBriefShareText } from '../../components/features/brief/brief-share';
import { LawyerBrief, PRINTING_BRIEF_CLASS } from '../../components/features/brief/LawyerBrief';
import { buildWhatsAppShareUrl } from '../../components/features/common/share-links';
import { buildSampleAnalysis } from './feature-fixtures';

describe('LawyerBrief', () => {
  const analysis = buildSampleAnalysis('rent-leave-licence');

  it('prints only the brief, then restores the page after printing', async () => {
    const user = userEvent.setup();
    const seenWhilePrinting: string[] = [];
    const print = vi.spyOn(window, 'print').mockImplementation(() => {
      const brief = document.body.querySelector('.brief-print');
      if (document.documentElement.classList.contains(PRINTING_BRIEF_CLASS) && brief !== null) {
        seenWhilePrinting.push(brief.textContent ?? '');
      }
    });
    render(<LawyerBrief analysis={analysis} />);

    await user.click(screen.getByRole('button', { name: 'Download brief (PDF)' }));

    expect(print).toHaveBeenCalledTimes(1);
    const [printed = ''] = seenWhilePrinting;
    expect(printed).toContain(analysis.title);
    expect(printed).toContain(analysis.summary.oneLine);
    for (const flag of analysis.flags) {
      expect(printed).toContain(flag.title);
      if (flag.law !== undefined) expect(printed).toContain(flag.law.url);
    }
    for (const question of analysis.lawyerQuestions) expect(printed).toContain(question);
    expect(printed).toContain('NALSA helpline 15100');
    expect(printed).toContain('not legal advice');

    act(() => {
      window.dispatchEvent(new Event('afterprint'));
    });

    expect(document.documentElement).not.toHaveClass(PRINTING_BRIEF_CLASS);
    expect(document.body.querySelector('.brief-print')).toBeNull();
  });

  it('never leaves the page in print mode after unmounting', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'print').mockImplementation(() => undefined);
    const { unmount } = render(<LawyerBrief analysis={analysis} />);
    await user.click(screen.getByRole('button', { name: 'Download brief (PDF)' }));
    expect(document.documentElement).toHaveClass(PRINTING_BRIEF_CLASS);

    unmount();

    expect(document.documentElement).not.toHaveClass(PRINTING_BRIEF_CLASS);
  });

  it('shares flag titles and questions on WhatsApp — never the document text', () => {
    render(<LawyerBrief analysis={analysis} />);
    const share = screen.getByRole('link', { name: /^Share on WhatsApp/ });
    const text = buildBriefShareText(analysis);
    expect(share).toHaveAttribute('href', buildWhatsAppShareUrl(text));
    for (const flag of analysis.flags) expect(text).toContain(flag.title);
    for (const question of analysis.lawyerQuestions) expect(text).toContain(question);
    expect(text).not.toContain(analysis.summary.oneLine);
    for (const clause of analysis.clauses) expect(text).not.toContain(clause.quote);
  });
});
