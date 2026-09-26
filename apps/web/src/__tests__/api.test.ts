/**
 * API client tests: response validation and error mapping with a mocked fetch.
 */
import { describe, expect, it, vi } from 'vitest';
import { type DocumentFacts, GOOGLE_SERVICES, runScenario } from '@sign-se-pehle/core';
import { getGoogleServices, getHealth, simulateScenario } from '../lib/api';
import { jsonResponse, requestBody, stubFetch, unwrap } from './helpers';

const RENTAL_FACTS: DocumentFacts = {
  monthlyRentInr: 20_000,
  securityDepositInr: 100_000,
  lockInMonths: 11,
  tenantNoticeDays: 30,
};

const HTTP_TOO_MANY_REQUESTS = 429;
const HTTP_BAD_GATEWAY = 502;

describe('api client', () => {
  it('posts a typed payload and returns the schema-validated result', async () => {
    const inputs = { monthsCompleted: 3 };
    const expected = unwrap(runScenario('rental-leave-early', RENTAL_FACTS, inputs));
    const fetchMock = stubFetch(jsonResponse(expected));

    const result = await simulateScenario({
      scenarioId: 'rental-leave-early',
      facts: RENTAL_FACTS,
      inputs,
    });

    expect(result).toEqual({ ok: true, value: expected });
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/simulate');
    expect(fetchMock.mock.calls[0]?.[1]?.method).toBe('POST');
    expect(requestBody(fetchMock, 0)).toEqual({
      scenarioId: 'rental-leave-early',
      facts: RENTAL_FACTS,
      inputs,
    });
  });

  it('reads the Google services catalogue served by the API', async () => {
    stubFetch(jsonResponse({ services: GOOGLE_SERVICES }));
    const result = await getGoogleServices();
    expect(result.ok && result.value.services.map((service) => service.id)).toEqual(
      GOOGLE_SERVICES.map((service) => service.id),
    );
  });

  it('maps the error envelope to a typed ApiError', async () => {
    stubFetch(
      jsonResponse(
        { error: { code: 'RATE_LIMITED', message: 'Slow down' } },
        HTTP_TOO_MANY_REQUESTS,
      ),
    );
    const result = await getHealth();
    expect(result).toEqual({
      ok: false,
      error: { code: 'RATE_LIMITED', message: 'Slow down', status: HTTP_TOO_MANY_REQUESTS },
    });
  });

  it('treats unknown error codes and unreadable bodies as INTERNAL', async () => {
    stubFetch(
      jsonResponse({ error: { code: 'TEAPOT', message: 'Odd' } }, HTTP_BAD_GATEWAY),
      new Response('<html>gateway</html>', { status: HTTP_BAD_GATEWAY }),
    );
    const unknownCode = await getHealth();
    const unreadable = await getHealth();
    expect(unknownCode.ok ? null : unknownCode.error.code).toBe('INTERNAL');
    expect(unreadable.ok ? null : unreadable.error).toMatchObject({
      code: 'INTERNAL',
      status: HTTP_BAD_GATEWAY,
    });
  });

  it('rejects a 200 response that does not match the schema', async () => {
    stubFetch(jsonResponse({ status: 'ok' }));
    const result = await getHealth();
    expect(result.ok).toBe(false);
  });

  it('reports network failures with status 0', async () => {
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockRejectedValue(new TypeError('offline')));
    const result = await getHealth();
    expect(result.ok ? null : result.error.status).toBe(0);
  });
});
