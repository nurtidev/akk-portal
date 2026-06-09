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

  // Кабинет: заявка + лента статусов (текущий этап «На рассмотрении»).
  await page.getByText('Открыть личный кабинет', { exact: false }).click();
  await expect(page.locator('#cab-apps')).toContainText('AKK-', { timeout: 5000 });
  await expect(page.locator('#cab-apps')).toContainText('На рассмотрении');
});
