import { test, expect } from '@playwright/test';

test.describe('Authentication flow', () => {
  test('landing page CTA navigates to /auth', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Start Selling Online' }).click();
    await expect(page).toHaveURL('/auth');
  });

  test('auth page toggles between sign in and create account', async ({
    page,
  }) => {
    await page.goto('/auth');
    await expect(page.getByRole('heading', { level: 2 })).toHaveText('Sign In');

    await page.getByText("Don't have an account?").click();
    await expect(page.getByRole('heading', { level: 2 })).toHaveText(
      'Create Account',
    );

    await page.getByText('Already have an account?').click();
    await expect(page.getByRole('heading', { level: 2 })).toHaveText('Sign In');
  });

  test('shows validation errors on empty submit', async ({ page }) => {
    await page.goto('/auth');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await expect(page.getByText('Enter your email')).toBeVisible();
  });

  test('sign in with invalid credentials shows error', async ({ page }) => {
    await page.goto('/auth');
    await page.getByPlaceholder('you@example.com').fill('nonexistent@test.com');
    await page.getByPlaceholder('••••••••').fill('wrongpassword123');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await expect(page.getByText('Invalid login credentials')).toBeVisible({
      timeout: 10000,
    });
  });
});
