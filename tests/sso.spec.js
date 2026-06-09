// Демо-вход через eGov/Bayterek: клик по брендовой кнопке → вход (токен) → кабинет.
const { test, expect } = require('@playwright/test');

const BASE = process.env.BASE_URL || 'http://localhost:8090';

for (const provider of ['egov', 'bayterek']) {
  test('демо-вход через ' + provider + ' → кабинет', async ({ page }) => {
    await page.goto(BASE);
    await page.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
    await page.goto(BASE);

    // Открыть окно входа.
    await page.locator('.btn-login').first().click();
    // Кнопка провайдера видна и логинит.
    var btn = page.locator('#sso-' + provider);
    await expect(btn).toBeVisible({ timeout: 5000 });
    await btn.click();

    // После входа в шапке появляется чип пользователя.
    await expect(page.locator('.user-chip')).toBeVisible({ timeout: 8000 });

    // Кабинет открывается и грузит заявки (реальный токен).
    await page.locator('.user-chip').click();
    await expect(page.getByText('Личный кабинет', { exact: false })).toBeVisible({ timeout: 5000 });
    await expect(page.locator('#cab-apps')).toBeVisible({ timeout: 5000 });
  });
}
