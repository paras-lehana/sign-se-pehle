/**
 * Core reader journeys against the real server: explain → tabbed report → ask → advice boundary,
 * the v0.2 differentiators (X-ray, negotiate, next steps, samples) and compare. Assertions check
 * behaviour a reader sees, not implementation details.
 */
import { expect, test, type Page } from '@playwright/test';
import { RENT_AGREEMENT, RENT_AGREEMENT_REVISED } from './fixtures';

/** Every analysis needs Gemini or the offline engine; allow for a cold model. */
const REPORT_TIMEOUT_MS = 90_000;

async function explain(page: Page, text: string = RENT_AGREEMENT): Promise<void> {
  await page.goto('/');
  const textbox = page.getByLabel('Paste the document text');
  await expect(textbox).toHaveValue('');
  await textbox.fill(text);
  await page.getByRole('button', { name: 'Explain this document' }).click();
  await expect(page.getByRole('tab', { name: /^red flags/i })).toBeVisible({ timeout: REPORT_TIMEOUT_MS });
}

async function openTab(page: Page, name: RegExp): Promise<void> {
  const tab = page.getByRole('tab', { name });
  await tab.click();
  await expect(tab).toHaveAttribute('aria-selected', 'true');
}

test.describe('explain a document', () => {
  test('pasting an agreement produces a tabbed report with red flags and provenance', async ({ page }) => {
    await explain(page);
    await expect(page.getByText(/explained by gemini|offline rules/i).first()).toBeVisible();
    await openTab(page, /^red flags/i);
    await expect(page.getByText(/security deposit/i).first()).toBeVisible();
  });

  test('the ask panel answers from the document and declines advice', async ({ page }) => {
    await explain(page);
    await openTab(page, /^ask/i);
    const question = page.getByLabel('Your question');
    await question.fill('How much notice must the tenant give?');
    await question.press('Enter');
    await expect(page.getByText(/notice/i).last()).toBeVisible({ timeout: REPORT_TIMEOUT_MS });

    await question.fill('Should I sign this agreement?');
    await question.press('Enter');
    await expect(page.getByText(/lawyer|advocate|legal aid/i).last()).toBeVisible({ timeout: REPORT_TIMEOUT_MS });
  });

  test('an empty submission shows an accessible error', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Explain this document' }).click();
    await expect(page.getByRole('alert')).toContainText(/paste the document text/i);
  });
});

test.describe('v0.2 features', () => {
  test('a sample fills the form without running it', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('tab', { name: /samples/i }).click();
    await page.getByRole('button', { name: /job offer letter/i }).click();
    await page.getByRole('tab', { name: /paste/i }).click();
    await expect(page.getByLabel('Paste the document text')).not.toHaveValue('');
    await expect(page.getByRole('tab', { name: /^red flags/i })).toHaveCount(0);
  });

  test('tapping an X-ray highlight opens that clause', async ({ page }) => {
    await explain(page);
    // Phones show the X-ray collapsed above the tabs; open it the way a reader would.
    const xraySummary = page.locator('summary', { hasText: 'Document X-ray' });
    if (await xraySummary.isVisible()) await xraySummary.click();
    await page.getByRole('button', { name: /^clause: .*high risk$/i }).first().click();
    await expect(page.getByRole('tab', { name: /^clauses/i })).toHaveAttribute('aria-selected', 'true');
  });

  test('negotiate drafts fairer wording and a ready message', async ({ page }) => {
    await explain(page);
    await openTab(page, /^negotiate/i);
    await page.getByRole('button', { name: /draft my request/i }).click();
    await expect(page.getByRole('button', { name: /copy message/i })).toBeVisible({ timeout: REPORT_TIMEOUT_MS });
    await expect(page.getByRole('link', { name: /open in whatsapp/i })).toBeVisible();
  });

  test('the free legal aid check runs in the browser', async ({ page }) => {
    await explain(page);
    await openTab(page, /^next steps/i);
    await expect(page.getByText(/your answers never leave this device/i)).toBeVisible();
    await page.getByLabel(/i am a woman/i).check();
    await page.getByRole('button', { name: /check free legal aid/i }).click();
    await expect(page.getByText(/generally eligible for free legal aid/i)).toBeVisible();
  });
});

test('compare two drafts shows what changed', async ({ page }) => {
  await page.goto('/compare');
  await page.getByLabel('First draft (older)').fill(RENT_AGREEMENT);
  await page.getByLabel('Second draft (newer)').fill(RENT_AGREEMENT_REVISED);
  await page.getByRole('button', { name: /compare drafts/i }).click();
  await expect(page.getByText(/security deposit/i).first()).toBeVisible({ timeout: REPORT_TIMEOUT_MS });
});
