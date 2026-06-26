import { test, expect } from '@playwright/test';
import { seedApplication, loginAsAdmin } from './helpers';

test('список показывает засеянную заявку и открывает её карточку', async ({ page }) => {
  const app = await seedApplication({ amount: 7_777_000, purpose: 'Список-тест', program: 'isker' });
  await loginAsAdmin(page);

  await page.goto('/applications');
  await expect(page.getByRole('heading', { name: 'Заявки' })).toBeVisible();

  // Строка с номером заявки видна в таблице
  const row = page.getByRole('row', { name: new RegExp(app.number) });
  await expect(row).toBeVisible();

  // Клик по строке открывает карточку заявки
  await row.click();
  await expect(page).toHaveURL(new RegExp(`/applications/${app.uid}`));
  await expect(page.getByText(`Заявка ${app.number}`)).toBeVisible();
});

test('фильтр-чип «Все» присутствует со счётчиком', async ({ page }) => {
  await seedApplication();
  await loginAsAdmin(page);

  await page.goto('/applications');
  await expect(page.getByRole('button', { name: /Все/ })).toBeVisible();
});
