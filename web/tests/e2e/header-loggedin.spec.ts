// =====================================================
// ===== E2E: Шапка с залогиненным профилем не ломает навигацию
// Баг: при входе (профиль шире кнопки «Войти») пункты навигации
// переносились на 2 строки («О корпорации» ломалась). Фикс: whitespace-nowrap
// + полный десктоп-режим навигации с xl (ниже — бургер).
// Сессию подделываем через localStorage['akk-tokens'] с JWT, где есть name/iin
// (профиль поднимается из JWT; me() без бэкенда профиль не трогает).
// =====================================================

import { test, expect, type Page } from '@playwright/test';

/** Собрать «UI-only» JWT (подпись не проверяется) с нужными клеймами. */
function makeJwt(payload: Record<string, unknown>): string {
  const b64url = (obj: Record<string, unknown>) =>
    Buffer.from(JSON.stringify(obj), 'utf8')
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  return `${b64url({ alg: 'none', typ: 'JWT' })}.${b64url(payload)}.sig`;
}

const TOKEN = makeJwt({
  name: 'Асхат Серіков',
  iin: '830512300123',
  phone: '+77011234567',
});

/** Подставить сессию ДО загрузки страницы. */
async function loginViaStorage(page: Page) {
  await page.addInitScript((tok) => {
    localStorage.setItem('akk-tokens', JSON.stringify({ accessToken: tok }));
  }, TOKEN);
}

const DESKTOP_NAV = 'Основная навигация';

test.describe('Залогинен, xl (1280) — навигация в одну строку', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('профиль виден и все пункты навигации в одну строку', async ({ page }) => {
    await loginViaStorage(page);
    await page.goto('/ru');

    // Профиль вошедшего (чип с именем) — значит сессия поднялась.
    await expect(page.getByRole('button', { name: /Асхат/ })).toBeVisible();

    const nav = page.getByRole('navigation', { name: DESKTOP_NAV });
    await expect(nav).toBeVisible();

    // Все 5 пунктов видны.
    for (const name of ['О корпорации', 'Клиентам', 'Партнёрам', 'Пресс-центр', 'Контакты']) {
      await expect(nav.getByText(name, { exact: true })).toBeVisible();
    }

    // Главное: навигация НЕ переносится на 2 строки — высота ≈ одна строка.
    const box = await nav.boundingBox();
    expect(box, 'nav виден').not.toBeNull();
    expect(box!.height, 'навигация в одну строку (не 2)').toBeLessThan(40);

    await page.screenshot({ path: 'test-results/header-loggedin-1280.png' });
  });
});

test.describe('Залогинен, < xl (1100) — бургер вместо переноса', () => {
  test.use({ viewport: { width: 1100, height: 800 } });

  test('десктоп-навигация скрыта, показан бургер, профиль виден', async ({ page }) => {
    await loginViaStorage(page);
    await page.goto('/ru');

    await expect(page.getByRole('button', { name: /Асхат/ })).toBeVisible();
    // Полная десктоп-навигация спрятана (hidden xl:flex).
    await expect(page.getByRole('navigation', { name: DESKTOP_NAV })).toBeHidden();
    // Показан бургер.
    await expect(page.getByRole('button', { name: /Меню|Закрыть меню/ })).toBeVisible();
  });
});
