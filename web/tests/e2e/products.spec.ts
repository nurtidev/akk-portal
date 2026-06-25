// =====================================================
// E2E: раздел «Продукты» (запрос ПП с презентации).
// Каталог /ru/products → детальная /ru/products/[id] (вкладки
// Условия/Требования/Документы/Вопросы) → CTA-deeplink в воронку.
// Тексты — web/messages/ru/{content,common}.json. Пути с префиксом /ru.
// Скриншоты для глазной проверки кладём в docs/demo-shots/.
// =====================================================

import { test, expect } from '@playwright/test';
import path from 'node:path';

const SHOTS = path.join(__dirname, '..', '..', '..', 'docs', 'demo-shots');
const shot = (name: string, project: string) =>
  path.join(SHOTS, `products-${name}-${project}.png`);

test.describe('Раздел «Продукты»', () => {
  test('Шапка: пункт «Продукты» ведёт на каталог', async ({ page }) => {
    await page.goto('/ru');
    const link = page.getByRole('link', { name: 'Продукты', exact: true }).first();
    await expect(link).toBeVisible();
    await link.click();
    await expect(page).toHaveURL(/\/ru\/products$/);
    await expect(page.getByRole('heading', { name: 'Продукты и программы' })).toBeVisible();
  });

  test('Каталог: 6 программ, «Кең дала» (скрытая) отсутствует', async ({ page }, testInfo) => {
    await page.goto('/ru/products');
    // Видимые программы в каталоге.
    await expect(page.getByRole('heading', { name: 'Кең дала 2', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Игілік и Береке', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Іскер', exact: true })).toBeVisible();
    // «Кең дала» (hidden) убрана из каталога — точного заголовка нет.
    await expect(page.getByRole('heading', { name: 'Кең дала', exact: true })).toHaveCount(0);
    // На карточках — CTA «Рассчитать платёж» → детальная #calc.
    await expect(page.getByRole('link', { name: 'Рассчитать платёж' }).first()).toBeVisible();
    await page.screenshot({ path: shot('catalog', testInfo.project.name), fullPage: true });
  });

  test('Калькулятор на странице программы считает график', async ({ page }) => {
    await page.goto('/ru/products/agrobusiness_2#calc');
    await expect(page.getByRole('heading', { name: 'Калькулятор платежа' })).toBeVisible();
    // Есть строка переплаты (график посчитан).
    await expect(page.getByText('Общая переплата').first()).toBeVisible();
    // Смена срока не роняет расчёт.
    await page.getByRole('button', { name: '60 мес', exact: true }).click();
    await expect(page.getByText('Общая переплата').first()).toBeVisible();
  });

  test('Детальная: 4 вкладки переключаются (Условия→Требования→Документы)', async ({ page }, testInfo) => {
    await page.goto('/ru/products/igilik_bereke');
    await expect(page.getByRole('heading', { name: 'Игілік и Береке' })).toBeVisible();

    // Все 4 вкладки присутствуют.
    for (const tab of ['Условия', 'Требования', 'Документы', 'Вопросы']) {
      await expect(page.getByRole('tab', { name: tab })).toBeVisible();
    }
    // По умолчанию активна «Условия» — виден блок погашения/параметров.
    await expect(page.getByRole('tab', { name: 'Условия' })).toHaveAttribute('aria-selected', 'true');
    await page.screenshot({ path: shot('detail-conditions', testInfo.project.name), fullPage: true });

    // Переключение на «Требования» — сгруппированные блоки из регламента.
    await page.getByRole('tab', { name: 'Требования' }).click();
    await expect(page.getByRole('tab', { name: 'Требования' })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('heading', { name: 'Требования к заёмщику' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Требования к проекту' })).toBeVisible();

    // Переключение на «Документы» — видны бейджи «обязательно».
    await page.getByRole('tab', { name: 'Документы' }).click();
    await expect(page.getByText('обязательно', { exact: true }).first()).toBeVisible();
    await page.screenshot({ path: shot('detail-documents', testInfo.project.name), fullPage: true });

    // Вкладка «Вопросы» — программа-специфичный Q&A (не общий FAQ).
    await page.getByRole('tab', { name: 'Вопросы' }).click();
    await expect(
      page.getByText('Чем «Игілік» отличается от «Береке»?'),
    ).toBeVisible();
  });

  test('CTA-deeplink: «Подать заявку» уводит в воронку (лендинг скрыт)', async ({ page }) => {
    // agrobusiness — без стресс-теста, applyDirect → визард.
    await page.goto('/ru/products/agrobusiness');
    await page.getByRole('link', { name: 'Подать заявку' }).click();
    // Ушли на главную, query-параметр вычищен (replaceState).
    await expect(page).toHaveURL(/\/ru$/);
    // Лендинг-герой скрыт — воронка не на стартовом экране (deeplink сработал).
    await expect(
      page.getByRole('heading', { name: /Финансирование аграрного бизнеса/ }),
    ).toHaveCount(0);
  });

  test('«Кең дала» удалена: прямой заход на детальную — 404', async ({ page }) => {
    const resp = await page.goto('/ru/products/ken_dala');
    expect(resp?.status()).toBe(404);
  });
});
