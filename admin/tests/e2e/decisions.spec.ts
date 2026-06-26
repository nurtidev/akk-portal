import { test, expect } from '@playwright/test';
import { seedApplication, loginAsAdmin } from './helpers';

test('advance двигает заявку на следующий этап', async ({ page }) => {
  const app = await seedApplication();
  await loginAsAdmin(page);
  await page.goto(`/applications/${app.uid}`);

  // Свежая заявка — на этапе «Регистрация заявки», кнопка ведёт на «Новая заявка»
  await expect(page.getByRole('button', { name: /Дальше.*Новая заявка/ })).toBeVisible();
  await page.getByRole('button', { name: /Дальше.*Новая заявка/ }).click();

  // После перехода статус = «Новая заявка», следующий этап — «На рассмотрении»
  await expect(page.getByRole('button', { name: /Дальше.*На рассмотрении/ })).toBeVisible();
});

test('возврат на доработку требует комментарий и помечает заявку', async ({ page }) => {
  const app = await seedApplication();
  await loginAsAdmin(page);
  await page.goto(`/applications/${app.uid}`);

  await page.getByRole('button', { name: 'На доработку' }).click();

  // Кнопка подтверждения заблокирована, пока комментарий пуст
  const confirm = page.getByRole('button', { name: 'Отправить на доработку' });
  await expect(confirm).toBeDisabled();

  await page.getByPlaceholder('Обязательный комментарий...').fill('Приложите финотчётность за 2 года');
  await expect(confirm).toBeEnabled();
  await confirm.click();

  // Статус «На доработке» + блок комментария администратора
  await expect(page.getByText('На доработке').first()).toBeVisible();
  await expect(page.getByText('Приложите финотчётность за 2 года')).toBeVisible();
});

test('отклонение переводит заявку в конечное состояние', async ({ page }) => {
  const app = await seedApplication();
  await loginAsAdmin(page);
  await page.goto(`/applications/${app.uid}`);

  await page.getByRole('button', { name: 'Отклонить' }).click();
  await page.getByPlaceholder('Обязательный комментарий...').fill('Не проходит по залогу');
  await page.getByRole('button', { name: 'Подтвердить отклонение' }).click();

  // Конечное состояние: плашка вместо кнопок действий
  await expect(page.getByText(/в конечном состоянии/)).toBeVisible();
  await expect(page.getByRole('button', { name: /Дальше/ })).toHaveCount(0);
});
