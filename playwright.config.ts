/**
 * Playwright configuration — end-to-end journeys and axe accessibility scans.
 *
 * Runs against the production build served by the real server (`npm start`), or against a
 * deployed URL when E2E_BASE_URL is set, so the same suite verifies the live Cloud Run service.
 */
import { defineConfig, devices } from '@playwright/test';

/** Local server port — matches the Cloud Run container port. */
const LOCAL_PORT = 8080;
const baseURL = process.env['E2E_BASE_URL'] ?? `http://localhost:${LOCAL_PORT}`;
const useLocalServer = process.env['E2E_BASE_URL'] === undefined;

export default defineConfig({
  testDir: 'e2e',
  timeout: 90_000,
  expect: { timeout: 60_000 },
  fullyParallel: false,
  retries: process.env['CI'] === undefined ? 0 : 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL,
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  ...(useLocalServer
    ? {
        webServer: {
          command: 'npm start',
          url: `http://localhost:${LOCAL_PORT}/api/health`,
          reuseExistingServer: true,
          timeout: 120_000,
          // Deterministic offline engine for local runs; live Gemini is covered by E2E_BASE_URL runs.
          env: { GEMINI_API_KEY: '' },
        },
      }
    : {}),
});
