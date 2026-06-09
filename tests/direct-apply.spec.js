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

  // Кабинет: заявка + лента статусов. Свежая заявка стоит на первом этапе «Регистрация заявки».
  await page.getByText('Открыть личный кабинет', { exact: false }).click();
  await expect(page.locator('#cab-apps')).toContainText('AKK-', { timeout: 5000 });
  await expect(page.locator('#cab-apps')).toContainText('Регистрация заявки');
  // Текущий этап свежей заявки — «Регистрация заявки» (строка с маркером «текущий этап»).
  await expect(
    page.locator('#cab-apps div', { hasText: 'текущий этап' }).last()
  ).toContainText('Регистрация заявки');

  // Демо-управление: «Продвинуть этап» двигает текущий этап на «Новая заявка».
  await page.getByRole('button', { name: 'Продвинуть этап →' }).first().click();
  await expect(
    page.locator('#cab-apps div', { hasText: 'текущий этап' }).last()
  ).toContainText('Новая заявка', { timeout: 5000 });
});
