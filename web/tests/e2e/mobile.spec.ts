// =====================================================
// ===== E2: Мобильный сценарий (390×844)
// Бургер-меню, прохождение квиза на мобиле, скриншот главной.
// Источник: легаси tests/mobile-screenshot.spec.js + onboarding.spec.js.
// Все пути с префиксом /ru.
// =====================================================

import { test, expect, devices, type Page } from '@playwright/test';

// Явно фиксируем мобильный профиль (iPhone 14, 390×844) — независимо от проекта.
test.use({ ...devices['iPhone 14'] });

/** Кликнуть по варианту ответа квиза. */
async function pickOption(page: Page, label: string | RegExp) {
  await page.getByRole('button', { name: label }).first().click();
}

test.describe('Мобильная вёрстка', () => {
  test('бургер открывается: группы разделов + кнопка «Войти»', async ({ page }) => {
    await page.goto('/ru');
    // Десктоп-навигация скрыта — открываем мобильное меню бургером (aria-label «Меню»).
    await page.getByRole('button', { name: 'Меню' }).click();

    const mobileNav = page.locator('#mobile-nav');
    await expect(mobileNav).toBeVisible();
    // Группы разделов из site-header (заголовки common.json → nav.corp / nav.clients).
    await expect(mobileNav.getByText('О корпорации')).toBeVisible();
    await expect(mobileNav.getByText('Клиентам')).toBeVisible();
    // Кнопка входа (MobileAuthSlot, гость → nav.login «Войти»).
    await expect(mobileNav.getByRole('button', { name: 'Войти' })).toBeVisible();
  });

  test('квиз проходится на мобиле (микрокредит → Іскер)', async ({ page }) => {
    await page.goto('/ru');
    await page.getByRole('button', { name: 'Подобрать программу' }).click();
    await expect(
      page.getByRole('heading', { name: 'Что хотите профинансировать?' }),
    ).toBeVisible();

    await pickOption(page, 'Микрокредит, стартап');
    await pickOption(page, 'Услуги, торговля, прочее');
    await pickOption(page, 'Только открываюсь');
    await pickOption(page, /^Село$/);
    await pickOption(page, /До 20 млн/);

    await expect(page.getByRole('heading', { name: /Найдено \d+/ })).toBeVisible();
    await expect(
      page.getByRole('heading', { level: 3, name: 'Іскер' }).first(),
    ).toBeVisible();
  });

  test('скриншот главной (full page) в test-results', async ({ page }) => {
    await page.goto('/ru');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await page.screenshot({ path: 'test-results/m-home.png', fullPage: true });
  });
});
