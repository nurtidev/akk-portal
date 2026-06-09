// Прямой выбор программы с главной → подача заявки → кабинет с лентой статусов.
const { test, expect } = require('@playwright/test');
const BASE = process.env.BASE_URL || 'http://localhost:8090';

test('прямой выбор программы → заявка → кабинет с движением заявки', async ({ page }) => {
  await page.goto(BASE);
  await page.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
  await page.goto(BASE);

  // Быстрый вход через eGov (получаем токен).
  await page.locator('.btn-login').first().click();
  await page.locator('#sso-egov').click();
  await expect(page.locator('.user-chip')).toBeVisible({ timeout: 8000 });

  // Выбрать первую программу прямо с главной → модалка → подать заявку (без квиза).
  await page.locator('.prog-tile').first().click();
  await page.getByText('Подать заявку по этой программе', { exact: false }).click();

  // Форма контактов (предзаполнена профилем) → отправить.
  await expect(page.locator('#submit-btn')).toBeVisible({ timeout: 5000 });
  await page.locator('[data-cb="name"]').fill('Бауыржан Сапаров');
  await page.locator('[data-cb-phone]').fill('77011234567');
  await page.locator('#submit-btn').click();

  // Успех с реальным номером.
  await expect(page.getByText(/AKK-\d{4}-\d{6}/)).toBeVisible({ timeout: 8000 });

  // Кабинет: заявка + лента статусов. Скоуп на первую (свежую) карточку — у демо-клиента
  // eGov может быть много заявок от прошлых прогонов, поэтому работаем строго с .first().
  await page.getByText('Открыть личный кабинет', { exact: false }).click();
  await expect(page.locator('#cab-apps')).toContainText('AKK-', { timeout: 5000 });
  const card = page.locator('.app-card').first();
  // Свежая заявка стоит на первом этапе «Регистрация заявки».
  await expect(card.locator('.stage-current')).toContainText('Регистрация заявки');

  // Демо-управление: «Продвинуть этап» двигает текущий этап на «Новая заявка».
  await card.getByRole('button', { name: 'Продвинуть этап →' }).click();
  await expect(page.locator('.app-card').first().locator('.stage-current'))
    .toContainText('Новая заявка', { timeout: 5000 });
});
