// Live-smoke против задеплоенного сайта: проверяет, что интеграция активна и
// доходит до экрана ввода SMS-кода (CheckBmg → 200 от живого бэкенда через CORS).
// Код не вводим (на проде OTP в ответе не возвращается). Запуск:
//   BASE_URL=https://akk-production-4a6b.up.railway.app npx playwright test tests/live-smoke.spec.js
const { test, expect } = require('@playwright/test');

const BASE = process.env.BASE_URL || 'https://akk-production-4a6b.up.railway.app';
const IIN = '99' + String(Date.now()).slice(-10);
const PHONE = '77012223344';

test('live: онбординг → заявка → регистрация доходит до экрана SMS-кода', async ({ page }) => {
  let checkBmgStatus = null;
  page.on('response', (res) => {
    if (res.url().includes('/Account/CheckBmgAndSendSmsForRegister')) checkBmgStatus = res.status();
  });

  await page.goto(BASE);
  await page.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
  await page.goto(BASE);

  await page.getByText('Начать подбор', { exact: false }).first().click();
  for (let i = 0; i < 14; i++) {
    const screen = await page.evaluate(() => (typeof state !== 'undefined' ? state.screen : ''));
    if (screen !== 'quiz') break;
    const opt = page.locator('#quiz-section .quiz-opt').first();
    if (!(await opt.isVisible().catch(() => false))) break;
    await opt.click();
    await page.waitForTimeout(350);
  }
  await expect.poll(() => page.evaluate(() => state.screen), { timeout: 8000 }).toBe('results');

  await page.locator('[data-action="apply"]').first().click();
  const skip = page.getByText('Пропустить и подать заявку', { exact: false }).first();
  if (await skip.isVisible().catch(() => false)) await skip.click();

  // Подача требует авторизации (визард) → сразу открывается окно входа.
  await expect(page.locator('#auth-modal.open')).toBeVisible({ timeout: 8000 });
  await page.getByText('Регистрация', { exact: false }).first().click();
  await page.locator('#reg-last').fill('Тестов');
  await page.locator('#reg-first').fill('Тест');
  await page.locator('#reg-iin').fill(IIN);
  await page.locator('#reg-phone').fill(PHONE);
  await page.locator('#reg-btn').click();

  // Экран ввода кода появился → CheckBmg вернул 200 от живого бэкенда (CORS ок).
  await expect(page.locator('#otp-0')).toBeVisible({ timeout: 10000 });
  expect(checkBmgStatus).toBe(200);
});
