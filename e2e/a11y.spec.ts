/**
 * Automated accessibility scans (axe-core, WCAG 2.0/2.1/2.2 A and AA) on every route and every
 * report tab, in both colour themes. Any serious or critical violation fails the run.
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { RENT_AGREEMENT, ROUTES } from './fixtures';

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
const BLOCKING_IMPACTS = new Set(['serious', 'critical']);
const REPORT_TABS = [/^overview/i, /^red flags/i, /^clauses/i, /^ask/i, /^what if/i, /^next steps/i, /^negotiate/i, /^brief/i];
const REPORT_TIMEOUT_MS = 90_000;

/**
 * Entrance animations fade text in; scan the settled page, not a half-transparent frame.
 * Only finite, clock-driven animations can finish — looping ones and the scroll-driven
 * progress bar never do, so they are ignored.
 */
async function settle(page: Page): Promise<void> {
  await page.waitForFunction(() =>
    document
      .getAnimations()
      .filter(
        (animation) =>
          animation.timeline === document.timeline &&
          animation.effect?.getComputedTiming().iterations !== Infinity,
      )
      .every((animation) => animation.playState === 'finished'),
  );
}

async function blockingViolations(page: Page): Promise<string[]> {
  await settle(page);
  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
  return results.violations
    .filter((violation) => BLOCKING_IMPACTS.has(violation.impact ?? ''))
    .map((violation) => `${violation.id}: ${violation.help}`);
}

for (const scheme of ['light', 'dark'] as const) {
  test.describe(`${scheme} theme`, () => {
    test.use({ colorScheme: scheme });

    for (const route of ROUTES) {
      test(`${route} has no serious accessibility violations`, async ({ page }) => {
        await page.goto(route);
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
        expect(await blockingViolations(page)).toEqual([]);
      });
    }

    test('every report tab has no serious accessibility violations', async ({ page }) => {
      await page.goto('/');
      await page.getByLabel('Paste the document text').fill(RENT_AGREEMENT);
      await page.getByRole('button', { name: 'Explain this document' }).click();
      await expect(page.getByRole('tab', { name: /^red flags/i })).toBeVisible({ timeout: REPORT_TIMEOUT_MS });
      for (const name of REPORT_TABS) {
        await page.getByRole('tab', { name }).click();
        expect(await blockingViolations(page), `tab ${String(name)}`).toEqual([]);
      }
    });
  });
}
