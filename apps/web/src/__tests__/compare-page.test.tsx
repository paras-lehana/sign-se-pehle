/**
 * Compare page tests: validation, typed request and the result tables.
 */
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import {
  type CompareResponse,
  type DocumentFacts,
  compareFacts,
  compareResponseSchema,
} from '@sign-se-pehle/core';
import { ComparePage } from '../pages/ComparePage';
import { jsonResponse, renderAt, requestBody, stubFetch } from './helpers';

const FIRST_DRAFT =
  '1. RENT. The Tenant shall pay Rs. 20,000 per month. 2. DEPOSIT. The Tenant shall pay a refundable security deposit of Rs. 40,000.';
const SECOND_DRAFT =
  '1. RENT. The Tenant shall pay Rs. 22,000 per month. 2. DEPOSIT. The Tenant shall pay a refundable security deposit of Rs. 1,10,000.';

const FIRST_FACTS: DocumentFacts = { monthlyRentInr: 20_000, securityDepositInr: 40_000 };
const SECOND_FACTS: DocumentFacts = { monthlyRentInr: 22_000, securityDepositInr: 110_000 };

function buildResponse(): CompareResponse {
  return compareResponseSchema.parse({
    summary: 'The second draft raises the rent and the deposit.',
    verdict: 'The first draft is gentler on the tenant.',
    changes: [
      {
        topic: 'Security deposit',
        first: 'Rs. 40,000',
        second: 'Rs. 1,10,000',
        change: 'changed',
        favours: 'first',
        note: 'A higher deposit locks up more of your money.',
      },
    ],
    factDeltas: compareFacts('rental', 'tenant', FIRST_FACTS, SECOND_FACTS),
    provenance: { mode: 'offline', models: [], latencyMs: 5, steps: [] },
  });
}

describe('ComparePage', () => {
  it('names the draft that failed validation', async () => {
    stubFetch();
    renderAt(<ComparePage />, '/compare');
    await userEvent.type(screen.getByLabelText('First draft (older)'), 'short');
    await userEvent.click(screen.getByRole('button', { name: 'Compare drafts' }));
    expect(screen.getByRole('alert')).toHaveTextContent(/^First draft:/);
  });

  it('sends both drafts and renders summary, changes and fact deltas', async () => {
    const response = buildResponse();
    const fetchMock = stubFetch(jsonResponse(response));
    const user = userEvent.setup();
    renderAt(<ComparePage />, '/compare');

    await user.click(screen.getByLabelText('First draft (older)'));
    await user.paste(FIRST_DRAFT);
    await user.click(screen.getByLabelText('Second draft (newer)'));
    await user.paste(SECOND_DRAFT);
    await user.selectOptions(screen.getByLabelText(/I am the/), 'tenant');
    await user.click(screen.getByRole('button', { name: 'Compare drafts' }));

    expect(await screen.findByText(response.summary)).toBeInTheDocument();
    expect(screen.getByText(response.verdict)).toBeInTheDocument();
    expect(screen.getByRole('table', { name: 'Changes between the drafts' })).toBeInTheDocument();
    for (const delta of response.factDeltas) {
      expect(screen.getByRole('rowheader', { name: delta.label })).toBeInTheDocument();
    }
    expect(requestBody(fetchMock, 0)).toEqual({
      first: FIRST_DRAFT,
      second: SECOND_DRAFT,
      language: 'en',
      role: 'tenant',
    });
  });
});
