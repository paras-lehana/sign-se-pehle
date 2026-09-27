/**
 * NegotiatePanel: sends only the risky clauses with the chosen tone and channel, then
 * shows the comparison, an editable message with share links, sources and provenance.
 */
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import {
  buildMailtoUrl,
  buildWhatsAppShareUrl,
} from '../../components/features/common/share-links';
import { draftProvenanceText } from '../../components/features/negotiate/DraftProvenance';
import { NegotiatePanel } from '../../components/features/negotiate/NegotiatePanel';
import { jsonResponse, requestBody, stubFetch } from '../helpers';
import { OFFLINE_PROVENANCE, buildNegotiation, buildSampleAnalysis } from './feature-fixtures';

const HTTP_TOO_MANY_REQUESTS = 429;

describe('NegotiatePanel', () => {
  const analysis = buildSampleAnalysis('personal-loan-floating');

  it('drafts an email with the risky clauses and shows current → fairer wording', async () => {
    const user = userEvent.setup();
    const { request, response } = buildNegotiation(analysis, { tone: 'firm', channel: 'email' });
    expect(response.asks.length).toBeGreaterThan(0);
    const fetchMock = stubFetch(jsonResponse(response));
    render(<NegotiatePanel analysis={analysis} />);

    await user.click(screen.getByRole('radio', { name: /^Firm/ }));
    await user.click(screen.getByRole('radio', { name: /^Email/ }));
    await user.click(screen.getByRole('button', { name: 'Draft my request' }));

    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/negotiate');
    expect(requestBody(fetchMock, 0)).toEqual(request);
    expect(await screen.findByText(draftProvenanceText(response.provenance))).toBeInTheDocument();
    const table = screen.getByRole('table');
    for (const ask of response.asks) {
      const row = within(table).getByRole('rowheader', { name: ask.heading }).closest('tr');
      expect(row).not.toBeNull();
      if (row === null) continue;
      expect(row).toHaveTextContent(ask.proposed);
      expect(row).toHaveTextContent(ask.reason);
    }
    expect(
      screen.getByText(`Draft ready: ${response.asks.length}`, { exact: false }),
    ).toHaveAttribute('role', 'status');
    for (const reference of response.references) {
      expect(
        screen.getByRole('link', {
          name: (name) => name.startsWith(`${reference.act}, ${reference.section}`),
        }),
      ).toHaveAttribute('href', reference.url);
    }
  });

  it('lets the reader edit the message and shares exactly what they wrote', async () => {
    const user = userEvent.setup();
    const { response } = buildNegotiation(analysis, { tone: 'polite', channel: 'email' });
    stubFetch(jsonResponse(response));
    render(<NegotiatePanel analysis={analysis} />);
    await user.click(screen.getByRole('radio', { name: /^Email/ }));
    await user.click(screen.getByRole('button', { name: 'Draft my request' }));

    const message = await screen.findByLabelText('Message (you can edit it)');
    const subject = screen.getByLabelText('Subject');
    expect(message).toHaveValue(response.message);
    await user.type(message, ' Thank you.');
    const edited = `${response.message} Thank you.`;
    const subjectText = subject instanceof HTMLInputElement ? subject.value : '';

    expect(screen.getByRole('link', { name: /^Open in WhatsApp/ })).toHaveAttribute(
      'href',
      buildWhatsAppShareUrl(edited),
    );
    expect(screen.getByRole('link', { name: 'Open in email' })).toHaveAttribute(
      'href',
      buildMailtoUrl(subjectText, edited),
    );

    await user.click(screen.getByRole('button', { name: 'Copy message' }));
    expect(await navigator.clipboard.readText()).toBe(`Subject: ${subjectText}\n\n${edited}`);
    expect(screen.getByText('Message copied.')).toBeInTheDocument();
  });

  it('is honest when the draft came from offline suggestions', async () => {
    const user = userEvent.setup();
    const { response } = buildNegotiation(
      analysis,
      { tone: 'polite', channel: 'whatsapp' },
      OFFLINE_PROVENANCE,
    );
    stubFetch(jsonResponse(response));
    render(<NegotiatePanel analysis={analysis} />);
    await user.click(screen.getByRole('button', { name: 'Draft my request' }));
    expect(await screen.findByText(draftProvenanceText(OFFLINE_PROVENANCE))).toBeInTheDocument();
    expect(screen.queryByLabelText('Subject')).not.toBeInTheDocument();
  });

  it('shows the server’s message when drafting fails', async () => {
    const user = userEvent.setup();
    stubFetch(
      jsonResponse(
        { error: { code: 'RATE_LIMITED', message: 'Please wait a minute.' } },
        HTTP_TOO_MANY_REQUESTS,
      ),
    );
    render(<NegotiatePanel analysis={analysis} />);
    await user.click(screen.getByRole('button', { name: 'Draft my request' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Please wait a minute.');
  });

  it('has nothing to negotiate when no clause is risky', () => {
    const calm = {
      ...analysis,
      clauses: analysis.clauses.map((clause) => ({ ...clause, risk: 'low' as const })),
    };
    render(<NegotiatePanel analysis={calm} />);
    expect(screen.getByText(/nothing to push back on/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Draft my request' })).not.toBeInTheDocument();
  });
});
