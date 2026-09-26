/**
 * Shared test helpers: fetch stubbing, JSON responses and routed rendering.
 *
 * Responsibility: keep tests focused on behaviour by hiding fetch plumbing.
 * Boundary: test-only; never imported by application code.
 */
import type { ReactElement } from 'react';
import { render, type RenderResult } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { type Mock, vi } from 'vitest';
import { type Result } from '@sign-se-pehle/core';

export const HTTP_OK = 200;

/** A JSON Response exactly as the server would send it. */
export function jsonResponse(body: unknown, status: number = HTTP_OK): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** Replaces global fetch with a mock that answers with `responses` in order. */
export function stubFetch(...responses: readonly Response[]): Mock<typeof fetch> {
  const fetchMock = vi.fn<typeof fetch>();
  for (const response of responses) fetchMock.mockResolvedValueOnce(response);
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

/** The parsed JSON body of the n-th fetch call. */
export function requestBody(fetchMock: Mock<typeof fetch>, callIndex: number): unknown {
  const body = fetchMock.mock.calls[callIndex]?.[1]?.body;
  if (typeof body !== 'string') return undefined;
  const parsed: unknown = JSON.parse(body);
  return parsed;
}

/** Unwraps a core Result in a test, failing loudly when a fixture cannot be built. */
export function unwrap<T>(result: Result<T>): T {
  if (!result.ok) throw new Error(`Fixture failed: ${result.error.message}`);
  return result.value;
}

/** Renders a tree inside a memory router at `path`. */
export function renderAt(ui: ReactElement, path = '/'): RenderResult {
  return render(<MemoryRouter initialEntries={[path]}>{ui}</MemoryRouter>);
}
