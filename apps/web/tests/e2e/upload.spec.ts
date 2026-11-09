import { test, expect } from '@playwright/test';

test.describe('Product upload flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth');
    await page
      .getByPlaceholder('you@example.com')
      .fill('test-seller@snapshop.app');
    await page.getByPlaceholder('••••••••').fill('Test@123456');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await page.waitForURL('/dashboard', { timeout: 10000 });
  });

  test('upload tab shows drop zone', async ({ page }) => {
    await page.getByRole('button', { name: 'Upload' }).click();
    await expect(
      page.getByRole('heading', { name: /Drag & drop/ }),
    ).toBeVisible();
  });

  test('shows processing state when files are uploaded', async ({ page }) => {
    await page.getByRole('button', { name: 'Upload' }).click();
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: /or click to browse/ }).click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles([Buffer.alloc(1024, 0)]);
    await expect(page.getByText('Processing...')).toBeVisible({
      timeout: 15000,
    });
  });
});
