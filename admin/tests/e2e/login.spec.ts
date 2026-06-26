import { test, expect } from '@playwright/test';

test('неверный пароль показывает ошибку', async ({ page }) => {
  await page.goto('/login');
  await page.fill('#username', 'admin');
  await page.fill('#password', 'wrong-pass');
  await page.getByRole('button', { name: 'Войти' }).click();
  await expect(page.getByText('неверный логин или пароль')).toBeVisible();
  await expect(page).toHaveURL(/\/login/);
});

test('успешный вход ведёт на список заявок', async ({ page }) => {
  await page.goto('/login');
  await page.fill('#username', 'admin');
  await page.fill('#password', 'akk-admin-2026');
  await page.getByRole('button', { name: 'Войти' }).click();
  await expect(page).toHaveURL(/\/applications/);
  await expect(page.getByRole('heading', { name: 'Заявки' })).toBeVisible();
});
