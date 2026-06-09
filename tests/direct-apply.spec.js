// Прямой выбор программы с главной → визард подачи заявки → трекер заявки.
const { test, expect } = require('@playwright/test');
const BASE = process.env.BASE_URL || 'http://localhost:8090';

test('прямой выбор программы → визард заявки → трекер', async ({ page }) => {
  await page.goto(BASE);
  await page.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
  await page.goto(BASE);

  // Вход через eGov (подача требует авторизации, как в банке).
  await page.locator('.btn-login').first().click();
  await page.locator('#sso-egov').click();
  await expect(page.locator('.user-chip')).toBeVisible({ timeout: 8000 });

  // Выбрать первую программу прямо с главной → модалка → подать заявку.
  await page.locator('.prog-tile').first().click();
  await page.locator('#prog-modal .pm-actions button.btn-primary').click();

  // Визард, шаг «Параметры».
  await expect(page.getByText('Заявка на кредит')).toBeVisible({ timeout: 5000 });
  await page.locator('#wiz-amount').fill('5000000');
  await page.locator('#wiz-purpose').selectOption({ label: 'Покупка скота / биоактивов' });
  await page.locator('#wiz-next').click();

  // Шаг «Заявитель» — данные из госбаз, продолжаем.
  await expect(page.getByText('подтверждены через eGov', { exact: false })).toBeVisible({ timeout: 4000 });
  await page.locator('#wiz-next').click();

  // Шаг «Согласия» — без галочки дальше нельзя (одно общее согласие).
  await page.locator('#wiz-next').click();
  await expect(page.locator('#wiz-err')).toContainText('согласие');
  await page.locator('#wiz-c-main').check();
  await page.locator('#wiz-next').click();

  // Шаг «Подтверждение по SMS» — код подставляется (демо).
  await page.getByText('Отправить код по SMS', { exact: false }).click();
  await page.locator('#wiz-otp').waitFor({ timeout: 4000 });
  await page.locator('#wiz-next').click();

  // Шаг «Готово» — номер заявки.
  await expect(page.getByText('Заявка подана', { exact: false })).toBeVisible({ timeout: 6000 });
  await expect(page.getByText(/AKK-\d{4}-\d{6}/)).toBeVisible();

  // Открыть заявку → страница-трекер с движением.
  await page.getByText('Открыть заявку', { exact: false }).click();
  await expect(page.locator('#application-container .appx-header')).toBeVisible({ timeout: 6000 });
  await expect(page.locator('#application-container')).toContainText('Движение заявки');
});
