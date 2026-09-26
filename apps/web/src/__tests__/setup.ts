/**
 * Test setup: registers jest-dom matchers and resets the DOM between tests.
 *
 * Responsibility: shared environment for every web test. Boundary: no global fetch
 * mock here — each test stubs exactly the responses it needs.
 */
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
