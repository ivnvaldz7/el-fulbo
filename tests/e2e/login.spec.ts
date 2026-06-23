import { test, expect } from '@playwright/test';

test.describe('Login page', () => {
  test('loads and displays the login options', async ({ page }) => {
    await page.goto('/login');

    await expect(page.getByRole('heading', { name: /Entrá a la cancha/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Entrar con Google/i })).toBeVisible();
  });

});
