// E2E через реальный браузер: онбординг → подать заявку → регистрация по SMS →
// создание заявки → личный кабинет со списком заявок.
// Требует: запущенный dev-proxy на BASE и бэкенд с OTP_DEBUG_RETURN=true.
const { test, expect } = require('@playwright/test');

const BASE = process.env.BASE_URL || 'http://localhost:8090';
// Уникальный ИИН на каждый прогон, чтобы не упираться в rate-limit/существующего юзера.
const IIN = '99' + String(Date.now()).slice(-10);
const PHONE = '77012223344';

test('онбординг → заявка → регистрация по SMS → кабинет', async ({ page }) => {
  // Перехватываем debugCode из ответов отправки SMS.
  let smsCode = null;
  page.on('response', async (res) => {
    if (res.url().includes('/Account/CheckBmgAndSendSmsForRegister') || res.url().includes('/Account/RequestSms')) {
      try { const j = await res.json(); if (j && j.debugCode) smsCode = j.debugCode; } catch (e) {}
    }
  });

  await page.goto(BASE);
  await page.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
  await page.goto(BASE);

  // 1. Онбординг-подбор.
  await page.getByText('Начать подбор', { exact: false }).first().click();
  // Проходим квиз: на каждом шаге кликаем первый вариант, пока screen не станет 'results'.
  for (let i = 0; i < 14; i++) {
    const screen = await page.evaluate(() => (typeof state !== 'undefined' ? state.screen : ''));
    if (screen !== 'quiz') break;
    const opt = page.locator('#quiz-section .quiz-opt').first();
    if (!(await opt.isVisible().catch(() => false))) break;
    await opt.click();
    await page.waitForTimeout(350); // auto-advance таймер квиза — 180мс, ждём дольше
  }
  await expect.poll(() => page.evaluate(() => state.screen), { timeout: 5000 }).toBe('results');

  // 2. Подать заявку по первой программе.
  const applyBtn = page.locator('[data-action="apply"]').first();
  await expect(applyBtn).toBeVisible({ timeout: 5000 });
  await applyBtn.click();

  // Может быть стресс-тест — пропускаем, если есть.
  const skip = page.getByText('Пропустить и подать заявку', { exact: false }).first();
  if (await skip.isVisible().catch(() => false)) await skip.click();

  // 3. Форма контактов → Отправить.
  await page.locator('[data-cb="name"]').fill('Тестов Тест Тестович');
  await page.locator('[data-cb-phone]').fill(PHONE);
  await page.locator('#submit-btn').click();

  // 4. Открылась авторизация — идём в регистрацию.
  await expect(page.locator('#auth-modal.open')).toBeVisible({ timeout: 5000 });
  await page.getByText('Регистрация', { exact: false }).first().click();
  await page.locator('#reg-name').fill('Тестов Тест Тестович');
  await page.locator('#reg-iin').fill(IIN);
  await page.locator('#reg-phone').fill(PHONE);
  await page.locator('#reg-btn').click();

  // 5. Экран ввода кода — берём debugCode.
  await expect(page.locator('#otp-0')).toBeVisible({ timeout: 5000 });
  await expect.poll(() => smsCode, { timeout: 5000 }).not.toBeNull();
  for (let i = 0; i < 6; i++) await page.locator('#otp-' + i).fill(smsCode[i]);
  await page.locator('#otp-confirm').click();

  // 6. После регистрации заявка отправляется автоматически → успех с номером AKK-...
  await expect(page.getByText(/AKK-\d{4}-\d{6}/)).toBeVisible({ timeout: 8000 });

  // 7. Личный кабинет показывает заявку.
  await page.getByText('Открыть личный кабинет', { exact: false }).click();
  await expect(page.locator('#cab-apps')).toContainText('AKK-', { timeout: 5000 });
});
