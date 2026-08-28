import { test, expect } from '@playwright/test';

test.describe('Guest entry page', () => {
  test('redirects guests to the invitation welcome page', async ({ page }) => {
    await page.goto('/');

    await expect(page).toHaveURL(/\/welcome$/);
    await expect(page.getByRole('heading', { name: /Arrancá uniéndote a un grupo/i })).toBeVisible();
    await expect(page.getByText(/fase de invitación/i)).toBeVisible();
  });

  test('has an existing-account link to /login', async ({ page }) => {
    await page.goto('/');

    const entrarButton = page.getByRole('link', { name: /Ya tengo cuenta.*Entrar/i });
    await expect(entrarButton).toBeVisible();
    await expect(entrarButton).toHaveAttribute('href', '/login');
  });

  test('has a "Crear un grupo" link', async ({ page }) => {
    await page.goto('/');

    const crearButton = page.getByRole('link', { name: /Crear un grupo/i });
    await expect(crearButton).toBeVisible();
    await expect(crearButton).toHaveAttribute('href', '/groups/new');
  });

  test('explains that access requires an invitation', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByText(/Necesitás un código o link/i)).toBeVisible();
  });

  test('shows the organizer entrypoint', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('link', { name: /crear un grupo/i })).toHaveAttribute('href', '/groups/new');
  });
});
