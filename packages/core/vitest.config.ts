import { defineConfig } from 'vitest/config';

// Core is pure: no DOM, no network, no clock — the node environment is enough.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/__tests__/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/**/__tests__/**', 'src/index.ts'],
      reporter: ['text-summary', 'json-summary'],
      thresholds: { lines: 95, statements: 95, functions: 95, branches: 90 },
    },
  },
});
