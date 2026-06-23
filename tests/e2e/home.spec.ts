import { test, expect } from '@playwright/test';

test.describe('Home page', () => {
  test('loads and displays the brand title', async ({ page }) => {
    await page.goto('/');

    // The brand is rendered as two lines: "EL" and "FULBO"
    await expect(page.getByText('EL', { exact: true })).toBeVisible();
    await expect(page.getByText('FULBO', { exact: true })).toBeVisible();
  });

  test('has an ENTRAR button that links to /login', async ({ page }) => {
    await page.goto('/');

    const entrarButton = page.getByRole('link', { name: /ENTRAR/i });
    await expect(entrarButton).toBeVisible();
    await expect(entrarButton).toHaveAttribute('href', '/login');
  });

  test('has a "Crear un grupo" link', async ({ page }) => {
    await page.goto('/');

    const crearButton = page.getByRole('link', { name: /Crear un grupo/i });
    await expect(crearButton).toBeVisible();
    await expect(crearButton).toHaveAttribute('href', '/groups/new');
  });

  test('has a link to /join for invite codes', async ({ page }) => {
    await page.goto('/');

    const joinLink = page.getByRole('link', { name: /código de invitación/i });
    await expect(joinLink).toBeVisible();
    await expect(joinLink).toHaveAttribute('href', '/join');
  });
});
