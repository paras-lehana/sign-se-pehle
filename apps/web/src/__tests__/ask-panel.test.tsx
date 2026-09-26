/**
 * Ask panel tests: typed request, cited quotes, answer-type copy and follow-ups.
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { type AskResponse, askResponseSchema } from '@sign-se-pehle/core';
import { ANSWER_TYPE_NOTES } from '../components/report/AskAnswer';
import { AskPanel } from '../components/report/AskPanel';
import { OFFLINE_PROVENANCE, buildRentalAnalysis } from './fixtures';
import { jsonResponse, requestBody, stubFetch } from './helpers';

const analysis = buildRentalAnalysis();
const QUESTION = 'Can the landlord enter without telling me?';
const FOLLOW_UP = 'What notice must I give?';

/** Cites a clause the pipeline verified, so the quote and span come from core. */
function answered(): AskResponse {
  const cited = analysis.clauses.find((clause) => clause.quoteVerified && clause.span);
  return askResponseSchema.parse({
    answer: 'The agreement lets the landlord enter at any time.',
    answerType: 'answered',
    citations: cited?.span === undefined ? [] : [{ quote: cited.quote, span: cited.span }],
    followUps: [FOLLOW_UP],
    provenance: OFFLINE_PROVENANCE,
  });
}

describe('AskPanel', () => {
  it('asks with the analysis context and shows cited quotes', async () => {
    const response = answered();
    const fetchMock = stubFetch(jsonResponse(response));
    render(<AskPanel analysis={analysis} />);

    await userEvent.type(screen.getByLabelText('Your question'), QUESTION);
    await userEvent.click(screen.getByRole('button', { name: 'Ask' }));

    expect(await screen.findByText(response.answer)).toBeInTheDocument();
    expect(screen.getAllByText('From your document')).toHaveLength(response.citations.length);
    expect(requestBody(fetchMock, 0)).toEqual({
      documentText: analysis.document.text,
      kind: analysis.kind,
      role: analysis.role,
      language: analysis.language,
      question: QUESTION,
      history: [],
    });
  });

  it('sends a follow-up chip with the conversation history', async () => {
    const first = answered();
    const second = askResponseSchema.parse({
      answer: 'Your document does not mention this.',
      answerType: 'not-in-document',
      citations: [],
      followUps: [],
      provenance: OFFLINE_PROVENANCE,
    });
    const fetchMock = stubFetch(jsonResponse(first), jsonResponse(second));
    render(<AskPanel analysis={analysis} />);

    await userEvent.type(screen.getByLabelText('Your question'), QUESTION);
    await userEvent.click(screen.getByRole('button', { name: 'Ask' }));
    await userEvent.click(await screen.findByRole('button', { name: FOLLOW_UP }));

    const note = ANSWER_TYPE_NOTES['not-in-document'];
    expect(note).not.toBeNull();
    expect(await screen.findByText(note ?? '')).toBeInTheDocument();
    expect(requestBody(fetchMock, 1)).toMatchObject({
      question: FOLLOW_UP,
      history: [{ question: QUESTION, answer: first.answer }],
    });
  });

  it('asks for a question before sending', async () => {
    const fetchMock = stubFetch();
    render(<AskPanel analysis={analysis} />);
    await userEvent.click(screen.getByRole('button', { name: 'Ask' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Please type a question first.');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
