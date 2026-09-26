/**
 * Automated accessibility scans (axe-core, WCAG 2.0/2.1/2.2 A and AA) on every route in both
 * colour themes, plus the rendered report. Any serious or critical violation fails the run.
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { RENT_AGREEMENT, ROUTES } from './fixtures';

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
const BLOCKING_IMPACTS = new Set(['serious', 'critical']);

async function blockingViolations(page: Page): Promise<string[]> {
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

    test('the analysis report has no serious accessibility violations', async ({ page }) => {
      await page.goto('/');
      await page.getByLabel('Paste the document text').fill(RENT_AGREEMENT);
      await page.getByRole('button', { name: 'Explain this document' }).click();
      await expect(page.getByRole('heading', { level: 2, name: /red flags/i })).toBeVisible();
      expect(await blockingViolations(page)).toEqual([]);
    });
  });
}
