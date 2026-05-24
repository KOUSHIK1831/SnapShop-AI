import { test, expect } from '@playwright/test';

test.describe('Storefront', () => {
  test('returns 404 for non-existent store', async ({ page }) => {
    await page.goto('/store/nonexistent-store-slug');
    await expect(
      page.getByRole('heading', { name: 'Store not found' }),
    ).toBeVisible();
  });

  test('shows empty state for store with no products', async ({ page }) => {
    await page.goto('/auth');
    await page
      .getByPlaceholder('you@example.com')
      .fill('test-seller@apnabazar.com');
    await page.getByPlaceholder('••••••••').fill('Test@123456');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await page.waitForURL('/dashboard', { timeout: 10000 });
    const storeUrl = await page
      .getByRole('button', { name: /View Store/ })
      .getAttribute('href');
    if (storeUrl) {
      await page.goto(storeUrl);
      await expect(page.getByText('No products listed yet.')).toBeVisible();
    }
  });

  test('footer shows Powered by ApnaBazar', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Powered by ApnaBazar')).toBeVisible();
  });
});
