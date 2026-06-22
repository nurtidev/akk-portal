// =====================================================
// ===== E2E: Шапка во время воронки (квиза)
// Регресс-гард: логотип «на главную» должен возвращать на лендинг ИЗ ЛЮБОГО
// шага воронки. Баг был в том, что экран воронки — клиентский стейт, не
// привязанный к URL: клик по логотипу вёл на тот же /{locale}, Next не
// перемонтировал страницу и квиз «залипал». Фикс: шапка шлёт событие
// 'akk:go-home', <Funnel/> сбрасывается в лендинг.
// Плюс проверяем, что переходы в ДРУГИЕ разделы из квиза работают (кросс-роут).
// =====================================================

import { test, expect, type Page } from '@playwright/test';

test.use({ viewport: { width: 1280, height: 800 } });

const SELECTOR_HEADING = 'На что вам нужны средства?';

/** Открыть /ru и запустить квиз кликом по крупной плитке «Посевная». */
async function startQuizFromHome(page: Page) {
  await page.goto('/ru');
  await page
    .getByRole('region', { name: SELECTOR_HEADING })
    .getByRole('button', { name: /Весенне-полевые и уборочные работы/ })
    .click();
  await expect(page.getByRole('heading', { name: 'Сколько лет ведёте деятельность?' })).toBeVisible();
}

test.describe('Шапка во время квиза', () => {
  test('логотип возвращает на главную (лендинг) из квиза', async ({ page }) => {
    await startQuizFromHome(page);

    await page.getByRole('link', { name: 'АКК — на главную' }).click();

    // Снова виден intent-selector лендинга, а вопрос квиза скрыт.
    await expect(page.getByRole('heading', { name: SELECTOR_HEADING })).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Сколько лет ведёте деятельность?' }),
    ).toHaveCount(0);
  });

  test('логотип возвращает на главную из ЭКРАНА РЕЗУЛЬТАТОВ', async ({ page }) => {
    await startQuizFromHome(page);
    // Доводим до результатов.
    await page.getByRole('button', { name: 'Более 3 лет' }).first().click();
    await page.getByRole('button', { name: /100 – 500 млн/ }).first().click();
    await expect(page.getByRole('heading', { name: /Найдено \d+/ })).toBeVisible();

    await page.getByRole('link', { name: 'АКК — на главную' }).click();

    await expect(page.getByRole('heading', { name: SELECTOR_HEADING })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Найдено \d+/ })).toHaveCount(0);
  });

  test('после возврата логотипом квиз начинается заново (ответы сброшены)', async ({ page }) => {
    await startQuizFromHome(page);
    await page.getByRole('link', { name: 'АКК — на главную' }).click();
    await expect(page.getByRole('heading', { name: SELECTOR_HEADING })).toBeVisible();

    // Запускаем квиз снова — должны попасть на первый шаг (цель ещё не выбрана),
    // а не на «середину» прошлого прохода.
    await page
      .getByRole('region', { name: SELECTOR_HEADING })
      .getByRole('button', { name: /Покупка скота/ })
      .click();
    await expect(page.getByRole('heading', { name: 'Сколько лет ведёте деятельность?' })).toBeVisible();
  });

  test('переход в другой раздел («Контакты») из квиза работает', async ({ page }) => {
    await startQuizFromHome(page);
    await page.getByRole('link', { name: 'Контакты' }).first().click();
    await expect(page).toHaveURL(/\/ru\/contacts/);
  });
});
