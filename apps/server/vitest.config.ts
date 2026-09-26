import { defineConfig } from 'vitest/config';

// The server is exercised in-process with supertest; a fake model client and a fake
// clock keep every test deterministic, so the plain node environment is enough.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/__tests__/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      // index.ts only wires real I/O (listen, signals, stdout); the deploy smoke test covers it.
      exclude: ['src/**/__tests__/**', 'src/index.ts'],
      reporter: ['text-summary', 'json-summary'],
      thresholds: { lines: 85, statements: 85, functions: 85, branches: 75 },
    },
  },
});
