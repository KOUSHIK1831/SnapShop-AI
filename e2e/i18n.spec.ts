import { test, expect } from '@playwright/test';

test.describe('i18n language switching', () => {
  test('language switcher is visible on landing page', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByLabel('Switch language')).toBeVisible();
  });

  test('switching to Hindi changes text on landing page', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel('Switch language').click();
    await page.getByRole('button', { name: /हिन्दी/ }).click();
    await expect(page.getByText('डिजिटल बनाएं')).toBeVisible({ timeout: 5000 });
  });

  test('switching to Telugu changes text on landing page', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel('Switch language').click();
    await page.getByRole('button', { name: /తెలుగు/ }).click();
    await expect(page.getByText('డిజిటల్ చేయండి')).toBeVisible({
      timeout: 5000,
    });
  });

  test('language persists after page reload', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel('Switch language').click();
    await page.getByRole('button', { name: /हिन्दी/ }).click();
    await expect(page.getByText('डिजिटल बनाएं')).toBeVisible({ timeout: 5000 });
    await page.reload();
    await expect(page.getByText('डिजिटल बनाएं')).toBeVisible({ timeout: 5000 });
  });
});
