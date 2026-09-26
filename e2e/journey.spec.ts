/**
 * Core reader journeys against the real server: explain → report → ask → advice boundary, and
 * compare two drafts. Assertions check behaviour a reader sees, not implementation details.
 */
import { expect, test } from '@playwright/test';
import { RENT_AGREEMENT, RENT_AGREEMENT_REVISED } from './fixtures';

test.describe('explain a document', () => {
  test('pasting an agreement produces a report with red flags and provenance', async ({ page }) => {
    await page.goto('/');
    const textbox = page.getByLabel('Paste the document text');
    await expect(textbox).toHaveValue('');
    await textbox.fill(RENT_AGREEMENT);
    await page.getByRole('button', { name: 'Explain this document' }).click();

    await expect(page.getByRole('heading', { level: 2, name: /red flags/i })).toBeVisible();
    await expect(page.getByText(/security deposit/i).first()).toBeVisible();
    await expect(page.getByText(/explained by gemini|offline rules/i).first()).toBeVisible();
  });

  test('the ask panel answers from the document and declines advice', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel('Paste the document text').fill(RENT_AGREEMENT);
    await page.getByRole('button', { name: 'Explain this document' }).click();
    const question = page.getByLabel('Your question');
    await expect(question).toBeVisible();

    await question.fill('How much notice must the tenant give?');
    await question.press('Enter');
    await expect(page.getByText(/notice/i).last()).toBeVisible();

    await question.fill('Should I sign this agreement?');
    await question.press('Enter');
    await expect(page.getByText(/lawyer|advocate|legal aid/i).last()).toBeVisible();
  });

  test('an empty submission shows an accessible error', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Explain this document' }).click();
    await expect(page.getByRole('alert')).toContainText(/paste the document text/i);
  });
});

test('compare two drafts shows what changed', async ({ page }) => {
  await page.goto('/compare');
  await page.getByLabel('First draft (older)').fill(RENT_AGREEMENT);
  await page.getByLabel('Second draft (newer)').fill(RENT_AGREEMENT_REVISED);
  await page.getByRole('button', { name: /compare/i }).click();
  await expect(page.getByText(/security deposit/i).first()).toBeVisible();
});
