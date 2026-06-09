// Навигация из шапки работает из кабинета: логотип/Программы/Подбор/Контакты
// выходят из кабинета на лендинг и ведут к нужной секции.
const { test, expect } = require('@playwright/test');
const BASE = process.env.BASE_URL || 'http://localhost:8090';

async function login(page) {
  await page.goto(BASE);
  await page.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
  await page.goto(BASE);
  await page.locator('.btn-login').first().click();
  await page.locator('#sso-egov').click();
  await expect(page.locator('.user-chip')).toBeVisible({ timeout: 8000 });
}
async function openCabinet(page) {
  await page.locator('.user-chip').click();
  await page.locator('.auth-dd').getByRole('button', { name: 'Профиль' }).click();
  await expect(page.locator('#cabinet-section')).toBeVisible({ timeout: 4000 });
}

test('из кабинета: «Программы» → лендинг с секцией программ', async ({ page }) => {
  await login(page);
  await openCabinet(page);
  await page.locator('.site-nav a[href="#programs"]').click();
  await expect(page.locator('#programs')).toBeVisible({ timeout: 4000 });
  await expect(page.locator('#cabinet-section')).toBeHidden();
});

test('из кабинета: логотип → главная', async ({ page }) => {
  await login(page);
  await openCabinet(page);
  await page.locator('.logo').click();
  await expect(page.locator('#main')).toBeVisible({ timeout: 4000 });
  await expect(page.locator('#cabinet-section')).toBeHidden();
});

test('из кабинета: «Подбор» → квиз', async ({ page }) => {
  await login(page);
  await openCabinet(page);
  await page.locator('.site-nav a:has-text("Подбор")').click();
  await expect(page.locator('#quiz-section')).toBeVisible({ timeout: 4000 });
  await expect(page.locator('#cabinet-section')).toBeHidden();
});
