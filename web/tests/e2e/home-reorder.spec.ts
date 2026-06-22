// =====================================================
// ===== E2E: Главная — intent-selector наверху (v1) + двухуровневая сетка целей
// Проверяем перестановку лендинга (GoalCards → метрики → hero) и новую
// иерархию плиток: 2 крупные (Посевная/Кең дала, Скот) + 4 компактные.
// Плюс — что клик по плитке запускает преднастроенную воронку (purpose уже
// отвечён, отрасль авто-проставлена/пропущена там, где выводится из цели).
// Селекторы — по ролям и видимым текстам; клики по плиткам скоупим в регион
// селектора (section aria-label = funnel.goals.title), чтобы не ловить
// одноимённый текст из сетки программ/описаний.
// =====================================================

import { test, expect, type Page } from '@playwright/test';

test.use({ viewport: { width: 1280, height: 800 } });

const SELECTOR_HEADING = 'На что вам нужны средства?';
const METRICS_REGION = 'Почему АКК';

/** Открыть /ru и дождаться селектора целей (теперь это первый экран). */
async function openHome(page: Page) {
  await page.goto('/ru');
  await expect(page.getByRole('heading', { name: SELECTOR_HEADING })).toBeVisible();
}

/** Регион селектора целей — клики по плиткам адресуем строго внутри него. */
function selectorRegion(page: Page) {
  return page.getByRole('region', { name: SELECTOR_HEADING });
}

// --- 1. Порядок секций лендинга ----------------------------------------

test.describe('Лендинг — новый порядок секций (v1)', () => {
  test('hero сверху, затем intent-selector, затем метрики', async ({ page }) => {
    await openHome(page);

    const heroH1 = page.getByRole('heading', { level: 1 });
    const selector = page.getByRole('heading', { name: SELECTOR_HEADING });
    const metric = page.getByText('Кредитный портфель', { exact: true });

    const heroBox = await heroH1.boundingBox();
    const selBox = await selector.boundingBox();
    const metricBox = await metric.boundingBox();

    expect(heroBox, 'hero виден').not.toBeNull();
    expect(selBox, 'селектор виден').not.toBeNull();
    expect(metricBox, 'метрики видны').not.toBeNull();

    // Hero → селектор → метрики (сверху вниз).
    expect(heroBox!.y).toBeLessThan(selBox!.y);
    expect(selBox!.y).toBeLessThan(metricBox!.y);
  });

  test('полоса финансовых метрик присутствует (4 показателя)', async ({ page }) => {
    await openHome(page);
    const metrics = selectorRegionMetrics(page);
    await expect(metrics.getByText('Кредитный портфель', { exact: true })).toBeVisible();
    await expect(
      metrics.getByText('Клиентов получили финансирование', { exact: true }),
    ).toBeVisible();
    await expect(metrics.getByText('Профинансировано за год', { exact: true })).toBeVisible();
  });
});

/** Регион полосы метрик (section aria-label = funnel.whyAkk.title). */
function selectorRegionMetrics(page: Page) {
  return page.getByRole('region', { name: METRICS_REGION });
}

// --- 2. Двухуровневая сетка целей --------------------------------------

test.describe('Сетка целей — 2 крупные + 4 компактные', () => {
  const PRIMARY = ['Весенне-полевые и уборочные работы', 'Покупка скота'];
  const SECONDARY = [
    'Откорм или птицеводство',
    'Инвестиции, покупка основных средств',
    'Пополнение оборотных средств',
    'Микрокредит, стартап',
  ];

  test('все 6 целей присутствуют и кликабельны', async ({ page }) => {
    await openHome(page);
    const region = selectorRegion(page);
    for (const name of [...PRIMARY, ...SECONDARY]) {
      await expect(region.getByRole('button', { name: new RegExp(name) })).toBeVisible();
    }
  });

  test('две крупные плитки визуально больше компактных (по площади)', async ({ page }) => {
    await openHome(page);
    const region = selectorRegion(page);

    const primaryBox = await region
      .getByRole('button', { name: /Весенне-полевые и уборочные работы/ })
      .boundingBox();
    const secondaryBox = await region
      .getByRole('button', { name: /Микрокредит, стартап/ })
      .boundingBox();

    expect(primaryBox).not.toBeNull();
    expect(secondaryBox).not.toBeNull();
    const primaryArea = primaryBox!.width * primaryBox!.height;
    const secondaryArea = secondaryBox!.width * secondaryBox!.height;
    // Крупная плитка должна быть заметно больше компактной.
    expect(primaryArea).toBeGreaterThan(secondaryArea * 1.3);
  });
});

// --- 3. Клик по плитке → преднастроенная воронка -----------------------

test.describe('Плитка цели → квиз с предвыбором', () => {
  test('крупная «Посевная» (vprir): отрасль пропущена, сразу опыт', async ({ page }) => {
    await openHome(page);
    await selectorRegion(page)
      .getByRole('button', { name: /Весенне-полевые и уборочные работы/ })
      .click();

    // purpose=vprir → sector=plant авто → шаг «опыт».
    await expect(page.getByRole('heading', { name: 'Сколько лет ведёте деятельность?' })).toBeVisible();
    // Вопрос об отрасли НЕ показывается (выведен из цели).
    await expect(page.getByRole('heading', { name: 'Ваша основная отрасль?' })).toHaveCount(0);
    // И мы НЕ на первом вопросе (цель уже отвечена).
    await expect(page.getByRole('heading', { name: 'Что хотите профинансировать?' })).toHaveCount(0);
  });

  test('крупная «Скот» (livestock): сразу опыт', async ({ page }) => {
    await openHome(page);
    await selectorRegion(page).getByRole('button', { name: /Покупка скота/ }).click();
    await expect(page.getByRole('heading', { name: 'Сколько лет ведёте деятельность?' })).toBeVisible();
  });

  test('компактная «Инвестиции» (investments): отрасль СПРАШИВАЕТСЯ', async ({ page }) => {
    await openHome(page);
    await selectorRegion(page)
      .getByRole('button', { name: /Инвестиции, покупка основных средств/ })
      .click();
    // investments не выводит отрасль из цели — шаг «отрасль» показывается.
    await expect(page.getByRole('heading', { name: 'Ваша основная отрасль?' })).toBeVisible();
  });

  test('сквозной: «Посевная» → опыт 3+ → 100–500 млн → топ «Кең дала 2»', async ({ page }) => {
    await openHome(page);
    await selectorRegion(page)
      .getByRole('button', { name: /Весенне-полевые и уборочные работы/ })
      .click();
    await page.getByRole('button', { name: 'Более 3 лет' }).first().click();
    await page.getByRole('button', { name: /100 – 500 млн/ }).first().click();

    await expect(page.getByRole('heading', { name: /Найдено \d+/ })).toBeVisible();
    const top = page
      .locator('div')
      .filter({ has: page.getByRole('heading', { level: 3 }) })
      .filter({ hasText: 'Лучшее совпадение' })
      .last();
    await expect(top.getByRole('heading', { level: 3 })).toContainText('Кең дала 2');
  });
});

// --- 4. Скриншоты для глазной проверки ---------------------------------

test.describe('Скриншоты лендинга', () => {
  test('desktop 1280 — полная страница', async ({ page }) => {
    await openHome(page);
    await page.screenshot({ path: 'test-results/home-reorder-desktop.png', fullPage: true });
  });

  test('desktop 1280 — первый экран (селектор+метрики)', async ({ page }) => {
    await openHome(page);
    await page.screenshot({ path: 'test-results/home-reorder-abovefold.png' });
  });
});
