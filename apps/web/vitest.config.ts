/**
 * Vitest configuration for the web SPA.
 *
 * Responsibility: run component tests in jsdom with jest-dom matchers. Boundary: reuses
 * the Vite config so tests transform JSX exactly the way the production build does.
 */
import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config.ts';

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/__tests__/setup.ts'],
      include: ['src/**/__tests__/**/*.test.{ts,tsx}'],
      css: false,
      coverage: {
        provider: 'v8',
        include: ['src/**/*.{ts,tsx}'],
        exclude: ['src/**/__tests__/**', 'src/main.tsx'],
        reporter: ['text-summary', 'json-summary'],
      },
    },
  }),
);
