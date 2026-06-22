// =====================================================
// ===== E2E: Демо-вход по ИИН (для презентации председателю)
// Модалка входа = только ИИН + чекбокс согласия ПДн; eGov/Baiterek убраны.
// Кнопка «Получить код» активна только при валидном ИИН + поставленной галочке.
// Отправку кода не проверяем (нужен бэкенд) — только UI входной формы.
// =====================================================

import { test, expect } from '@playwright/test';

test.use({ viewport: { width: 1280, height: 800 } });

async function openLogin(page: import('@playwright/test').Page) {
  await page.goto('/ru');
  await page.getByRole('button', { name: 'Войти' }).first().click();
  await expect(page.getByRole('heading', { name: 'Вход в личный кабинет' })).toBeVisible();
}

test.describe('Демо-вход по ИИН', () => {
  test('модалка: только ИИН + согласие, без eGov/Baiterek', async ({ page }) => {
    await openLogin(page);

    // Поле ИИН есть.
    await expect(page.getByPlaceholder('XXXXXXXXXXXX')).toBeVisible();
    // Чекбокс согласия есть.
    await expect(page.getByRole('checkbox')).toBeVisible();

    // SSO убраны полностью.
    await expect(page.getByText('eGov', { exact: true })).toHaveCount(0);
    await expect(page.getByText('Baiterek', { exact: true })).toHaveCount(0);
  });

  test('кнопка «Получить код» активна только при ИИН + согласии', async ({ page }) => {
    await openLogin(page);

    const getCode = page.getByRole('button', { name: 'Получить код по SMS' });
    const iin = page.getByPlaceholder('XXXXXXXXXXXX');
    const consent = page.getByRole('checkbox');

    // Изначально — задизейблена.
    await expect(getCode).toBeDisabled();

    // Только ИИН — всё ещё нельзя (нет согласия).
    await iin.fill('830512300123');
    await expect(getCode).toBeDisabled();

    // ИИН + согласие — активна.
    await consent.check();
    await expect(getCode).toBeEnabled();

    // Снять согласие — снова нельзя.
    await consent.uncheck();
    await expect(getCode).toBeDisabled();
  });
});
