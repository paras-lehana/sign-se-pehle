/**
 * What-if panel tests: scenario list per kind, typed request and result table.
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { type DocumentFacts, KIND_PROFILES, formatInr, runScenario } from '@sign-se-pehle/core';
import { WhatIfPanel } from '../components/report/WhatIfPanel';
import { SCENARIO_SPECS } from '../lib/scenarios';
import { jsonResponse, requestBody, stubFetch, unwrap } from './helpers';

const RENTAL_FACTS: DocumentFacts = {
  monthlyRentInr: 18_000,
  securityDepositInr: 90_000,
  lockInMonths: 11,
  tenantNoticeDays: 30,
};

const MONTHS_COMPLETED = 4;

describe('WhatIfPanel', () => {
  it('offers exactly the scenarios core lists for the kind', () => {
    render(<WhatIfPanel kind="rental" facts={RENTAL_FACTS} />);
    const options = screen.getAllByRole('option').map((option) => option.textContent);
    expect(options).toEqual(KIND_PROFILES.rental.scenarios.map((id) => SCENARIO_SPECS[id].title));
  });

  it('renders nothing for kinds without scenarios', () => {
    const { container } = render(<WhatIfPanel kind="online-terms" facts={{}} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('posts the scenario inputs and shows the simulated total', async () => {
    const inputs = { monthsCompleted: MONTHS_COMPLETED };
    const expected = unwrap(runScenario('rental-leave-early', RENTAL_FACTS, inputs));
    const fetchMock = stubFetch(jsonResponse(expected));
    render(<WhatIfPanel kind="rental" facts={RENTAL_FACTS} />);

    await userEvent.type(
      screen.getByLabelText('Months completed so far'),
      String(MONTHS_COMPLETED),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Show me the numbers' }));

    expect(await screen.findByRole('table', { name: expected.title })).toBeInTheDocument();
    expect(screen.getAllByText(formatInr(expected.totalInr)).length).toBeGreaterThan(0);
    expect(requestBody(fetchMock, 0)).toEqual({
      scenarioId: 'rental-leave-early',
      facts: RENTAL_FACTS,
      inputs,
    });
  });

  it('shows the server message when the document lacks a needed number', async () => {
    stubFetch(
      jsonResponse(
        { error: { code: 'VALIDATION_FAILED', message: 'This document does not state the rent.' } },
        400,
      ),
    );
    render(<WhatIfPanel kind="rental" facts={{}} />);
    await userEvent.click(screen.getByRole('button', { name: 'Show me the numbers' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('does not state the rent');
  });
});
