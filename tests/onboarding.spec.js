// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('АКК Онбординг — лендинг и базовая навигация', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('загружается hero с правильным заголовком и количеством программ', async ({ page }) => {
    await expect(page).toHaveTitle(/АКК.*Подбор программы/);
    await expect(page.locator('h1')).toContainText('Финансирование');

    // Hero stat: 6 программ
    const programsStat = page.locator('.hero-stat-v').filter({ hasText: /^6$/ });
    await expect(programsStat).toBeVisible();
  });

  test('в превью-сетке показаны все 6 программ', async ({ page }) => {
    const tiles = page.locator('#prog-grid .prog-tile');
    await expect(tiles).toHaveCount(6);

    const expectedTitles = [
      'Кең дала 2', 'Агробизнес', 'Игілік и Береке',
      'Іскер', 'Откормплощадки и птицефабрики', 'Агробизнес 2.0',
    ];
    for (const title of expectedTitles) {
      await expect(
        page.locator('#prog-grid .prog-tile-title').filter({ hasText: new RegExp(`^${title}$`) })
      ).toBeVisible();
    }
  });

  test('Кең дала скрыта из превью-сетки', async ({ page }) => {
    await expect(
      page.locator('#prog-grid .prog-tile-title').filter({ hasText: /^Кең дала$/ })
    ).toHaveCount(0);
    await expect(page.locator('#prog-grid .prog-tile.indirect')).toHaveCount(0);
  });
});

test.describe('Квиз — основной флоу', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.click('button:has-text("Начать подбор")');
    await expect(page.locator('.quiz-question')).toBeVisible();
  });

  test('ВПРиУР → авто-отрасль растениеводство → 3+ → 100–500 млн → топ Кең дала 2', async ({ page }) => {
    await page.click('.quiz-opt:has-text("Весенне-полевые и уборочные работы")');
    // Sector skip — сразу опыт
    await expect(page.locator('.quiz-question')).toContainText('лет ведёте');
    await page.click('.quiz-opt:has-text("Более 3 лет")');
    await page.click('.quiz-opt:has-text("100 – 500 млн")');

    await expect(page.locator('#results-section')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('.rc-title').first()).toContainText('Кең дала 2');
  });

  test('Племенной скот → КРС → импортный → 100–499 голов → подбирает Игілік', async ({ page }) => {
    await page.click('.quiz-opt:has-text("Покупка скота")');
    await expect(page.locator('.quiz-question')).toContainText('лет ведёте');
    await page.click('.quiz-opt:has-text("Более 3 лет")');
    await page.click('.quiz-opt:has-text("100 – 500 млн")');
    await page.locator('.quiz-opt[data-key="animalType"][data-value="KRS"]').click();
    await page.click('.quiz-opt:has-text("Импортное племенное поголовье")');
    await page.click('.quiz-opt:has-text("100 – 499 голов")');

    await expect(page.locator('#results-section')).toBeVisible();
    await expect(page.locator('.rc-title').first()).toContainText(/Игілік|Береке/);
  });

  test('Племенной скот → КРС → импортный → 500+ голов → подбирает Береке', async ({ page }) => {
    await page.click('.quiz-opt:has-text("Покупка скота")');
    await page.click('.quiz-opt:has-text("Более 3 лет")');
    await page.click('.quiz-opt:has-text("Более 500 млн")');
    await page.locator('.quiz-opt[data-key="animalType"][data-value="KRS"]').click();
    await page.click('.quiz-opt:has-text("Импортное племенное поголовье")');
    await page.click('.quiz-opt:has-text("500 голов и более")');

    await expect(page.locator('#results-section')).toBeVisible();
    await expect(page.locator('.rc-title').first()).toContainText(/Игілік|Береке/);
  });

  test('Племенной скот → КРС → отечественный → Игілік не подходит, fallback Агробизнес', async ({ page }) => {
    await page.click('.quiz-opt:has-text("Покупка скота")');
    await page.click('.quiz-opt:has-text("Более 3 лет")');
    await page.click('.quiz-opt:has-text("100 – 500 млн")');
    await page.locator('.quiz-opt[data-key="animalType"][data-value="KRS"]').click();
    // Вопрос про импорт появляется только после выбора КРС.
    await expect(page.locator('.quiz-question')).toContainText(/импортное|отечественное/i);
    await page.click('.quiz-opt:has-text("Отечественный скот")');
    await page.click('.quiz-opt:has-text("100 – 499 голов")');

    await expect(page.locator('#results-section')).toBeVisible();
    const titles = await page.locator('.rc-title').allTextContents();
    expect(titles).not.toContain('Игілік и Береке');
    expect(titles.some(t => /Агробизнес/.test(t))).toBe(true);
  });

  test('Племенной скот → лошади → Игілік не подходит, fallback Агробизнес', async ({ page }) => {
    await page.click('.quiz-opt:has-text("Покупка скота")');
    await page.click('.quiz-opt:has-text("Более 3 лет")');
    await page.click('.quiz-opt:has-text("100 – 500 млн")');
    await page.locator('.quiz-opt[data-key="animalType"][data-value="HORSE"]').click();
    await page.click('.quiz-opt:has-text("100 – 499 голов")');

    await expect(page.locator('#results-section')).toBeVisible();
    const titles = await page.locator('.rc-title').allTextContents();
    expect(titles).not.toContain('Игілік и Береке');
    expect(titles.some(t => /Агробизнес/.test(t))).toBe(true);
  });

  test('Микрокредит → стартап → село → до 20 млн → подбирает Іскер', async ({ page }) => {
    await page.click('.quiz-opt:has-text("Микрокредит, стартап")');
    await page.click('.quiz-opt:has-text("Услуги, торговля, прочее")');
    await page.click('.quiz-opt:has-text("Только открываюсь")');
    await page.click('.quiz-opt:has-text("Село")');
    await page.click('.quiz-opt:has-text("До 20 млн")');

    await expect(page.locator('#results-section')).toBeVisible();
    await expect(page.locator('.rc-title').first()).toContainText('Іскер');
  });

  test('Откорм → авто-отрасль птицеводство → 3+ → 100–500 млн → подбирает Откормплощадки', async ({ page }) => {
    await page.click('.quiz-opt:has-text("Откорм или птицеводство")');
    // Sector skipped (auto-set to poultry)
    await expect(page.locator('.quiz-question')).toContainText('лет ведёте');
    await page.click('.quiz-opt:has-text("Более 3 лет")');
    await page.click('.quiz-opt:has-text("Малый город")');
    await page.click('.quiz-opt:has-text("100 – 500 млн")');

    await expect(page.locator('#results-section')).toBeVisible();
    await expect(page.locator('.rc-title').first()).toContainText('Откормплощадки');
  });

  test('Инвестиции → переработка → 3+ → 500+ млн → подбирает Агробизнес', async ({ page }) => {
    await page.click('.quiz-opt:has-text("Инвестиции, покупка основных средств")');
    // sector НЕ скипается, потому что цель «инвестиции» — отрасль может быть любой
    await page.click('.quiz-opt:has-text("Переработка сельхозпродукции")');
    await page.click('.quiz-opt:has-text("Более 3 лет")');
    await page.click('.quiz-opt:has-text("Более 500 млн")');

    await expect(page.locator('#results-section')).toBeVisible();
    const topTitle = await page.locator('.rc-title').first().textContent();
    expect(topTitle).toMatch(/Агробизнес/);
  });

  test('кнопка «Назад» возвращает на предыдущий шаг (с учётом скипа sector)', async ({ page }) => {
    await page.click('.quiz-opt:has-text("Весенне-полевые и уборочные работы")');
    await expect(page.locator('.quiz-question')).toContainText('лет ведёте');
    await page.click('.quiz-back');
    await expect(page.locator('.quiz-question')).toContainText('профинансировать');
  });
});

test.describe('Навигация по шагам квиза', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.click('button:has-text("Начать подбор")');
    await expect(page.locator('.quiz-question')).toBeVisible();
  });

  test('пройденные шаги клибельны, будущие — заблокированы', async ({ page }) => {
    // Микрокредит — полный флоу из 5 шагов (отрасль и регион не скрываются).
    await page.click('.quiz-opt:has-text("Микрокредит, стартап")');
    await page.click('.quiz-opt:has-text("Услуги, торговля, прочее")');
    // Сейчас шаг 3 (Опыт). Шаги 1-2 — done, 3 — current, 4-5 — locked.
    await expect(page.locator('.quiz-step.done')).toHaveCount(2);
    await expect(page.locator('.quiz-step.current')).toHaveCount(1);
    await expect(page.locator('.quiz-step.locked').first()).toBeDisabled();
  });

  test('клик по пройденному шагу переносит на него, ответы сохраняются', async ({ page }) => {
    await page.click('.quiz-opt:has-text("Весенне-полевые и уборочные работы")');
    await page.click('.quiz-opt:has-text("Более 3 лет")');
    // Сейчас шаг 3 (Сумма). Прыгаем на шаг 1 (Цель).
    await page.click('.quiz-step[data-goto="0"]');
    await expect(page.locator('.quiz-question')).toContainText('профинансировать');
    // Ответ «Опыт» сохранён — шаг помечен галочкой/done.
    const opytStep = page.locator('.quiz-step', { hasText: 'Опыт' });
    await expect(opytStep).toHaveClass(/done/);
  });

  test('можно прыгнуть вперёд на уже отвеченный шаг', async ({ page }) => {
    await page.click('.quiz-opt:has-text("Весенне-полевые и уборочные работы")');
    await page.click('.quiz-opt:has-text("Более 3 лет")');
    // Шаг 3 (Сумма). Прыгаем назад на шаг 1.
    await page.click('.quiz-step[data-goto="0"]');
    await expect(page.locator('.quiz-question')).toContainText('профинансировать');
    // Прыгаем вперёд на шаг 3 (Сумма) — он доступен, т.к. 1-2 отвечены.
    await page.click('.quiz-step[data-goto="2"]');
    await expect(page.locator('.quiz-question')).toContainText('сумма нужна');
  });

  test('изменение цели сохраняет совместимые ответы (опыт, регион)', async ({ page }) => {
    // Микрокредит и «Оборотные средства» обе показывают вопрос о регионе —
    // на смене цели между ними ответ про регион должен сохраниться.
    await page.click('.quiz-opt:has-text("Микрокредит, стартап")');
    await page.click('.quiz-opt:has-text("Услуги, торговля, прочее")');
    await page.click('.quiz-opt:has-text("Более 3 лет")');
    await page.click('.quiz-opt:has-text("Село")');
    // Шаг 5 (Сумма). Прыгаем на Цель и меняем её.
    await page.click('.quiz-step[data-goto="0"]');
    await page.click('.quiz-opt:has-text("Пополнение оборотных средств")');
    // После смены цели снова показывается вопрос об отрасли.
    await expect(page.locator('.quiz-question')).toContainText('основная отрасль');
    // Опыт и регион должны остаться отвеченными (шаги с галочкой).
    await expect(page.locator('.quiz-step', { hasText: 'Опыт' })).toHaveClass(/done/);
    await expect(page.locator('.quiz-step', { hasText: 'Регион' })).toHaveClass(/done/);
  });
});

test.describe('Калькулятор — расчёт графика', () => {
  test('двухплатёжный график Кең дала 2 показывает 05 декабря и 05 марта', async ({ page }) => {
    await page.goto('/');
    await page.click('button:has-text("Начать подбор")');
    await page.click('.quiz-opt:has-text("Весенне-полевые и уборочные работы")');
    await page.click('.quiz-opt:has-text("Более 3 лет")');
    await page.click('.quiz-opt:has-text("100 – 500 млн")');

    await expect(page.locator('.pay-box-title')).toContainText('два платежа');
    await expect(page.locator('.pay-row-label').filter({ hasText: '05 декабря' })).toBeVisible();
    await expect(page.locator('.pay-row-label').filter({ hasText: '05 марта' })).toBeVisible();
  });

  test('ставка Игілік — 6%, срок до 84 мес', async ({ page }) => {
    await page.goto('/');
    await page.click('button:has-text("Начать подбор")');
    await page.click('.quiz-opt:has-text("Покупка скота")');
    await page.click('.quiz-opt:has-text("Более 3 лет")');
    await page.click('.quiz-opt:has-text("100 – 500 млн")');
    await page.locator('.quiz-opt[data-key="animalType"][data-value="KRS"]').click();
    await page.click('.quiz-opt:has-text("Импортное племенное поголовье")');
    await page.click('.quiz-opt:has-text("100 – 499 голов")');

    const card = page.locator('.result-card').filter({ hasText: /Игілік|Береке/ }).first();
    await expect(card.locator('.rc-stat-v').filter({ hasText: /6%/ })).toBeVisible();
    await expect(card.locator('.rc-stat-v').filter({ hasText: /84 мес/ })).toBeVisible();
  });

  test('для Іскер срок зависит от цели: 60 мес для микрокредита, 84 мес для животноводства', async ({ page }) => {
    // Микрокредит — должно быть 60 мес.
    await page.goto('/');
    await page.click('button:has-text("Начать подбор")');
    await page.click('.quiz-opt:has-text("Микрокредит, стартап")');
    await page.click('.quiz-opt:has-text("Услуги, торговля, прочее")');
    await page.click('.quiz-opt:has-text("Только открываюсь")');
    await page.click('.quiz-opt:has-text("Село")');
    await page.click('.quiz-opt:has-text("До 20 млн")');
    let card = page.locator('.result-card').filter({ hasText: 'Іскер' }).first();
    let termValue = await card.locator('.rc-stat-v').filter({ hasText: /мес/ }).textContent();
    expect(termValue).toMatch(/60 мес/);

    // Покупка скота МРС → должно быть 84 мес.
    await page.goto('/');
    await page.click('button:has-text("Начать подбор")');
    await page.click('.quiz-opt:has-text("Покупка скота")');
    await page.click('.quiz-opt:has-text("Только открываюсь")');
    await page.click('.quiz-opt:has-text("До 20 млн")');
    await page.locator('.quiz-opt[data-key="animalType"][data-value="MRS"]').click();
    await page.click('.quiz-opt:has-text("До 100 голов")');
    card = page.locator('.result-card').filter({ hasText: 'Іскер' }).first();
    termValue = await card.locator('.rc-stat-v').filter({ hasText: /мес/ }).textContent();
    expect(termValue).toMatch(/84 мес/);
  });

  test('для Агробизнеса с целью ПОС срок ограничен 48 мес', async ({ page }) => {
    await page.goto('/');
    await page.click('button:has-text("Начать подбор")');
    await page.click('.quiz-opt:has-text("Пополнение оборотных средств")');
    await page.click('.quiz-opt:has-text("Переработка сельхозпродукции")');
    await page.click('.quiz-opt:has-text("Более 3 лет")');
    await page.click('.quiz-opt:has-text("Областной центр")');
    await page.click('.quiz-opt:has-text("100 – 500 млн")');

    // Точный заголовок: именно «Агробизнес», не «Агробизнес 2.0»
    // (у 2.0 ПОС ограничен 12 мес по регламенту, у Агробизнеса — 48 мес).
    const card = page.locator('.result-card').filter({
      has: page.locator('.rc-title', { hasText: /^Агробизнес$/ })
    });
    const termValue = await card.locator('.rc-stat-v').filter({ hasText: /мес/ }).textContent();
    expect(termValue).toMatch(/48 мес/);
  });

  test('для Агробизнес 2.0 с целью ПОС срок ограничен 12 мес (по регламенту)', async ({ page }) => {
    await page.goto('/');
    await page.click('button:has-text("Начать подбор")');
    await page.click('.quiz-opt:has-text("Пополнение оборотных средств")');
    await page.click('.quiz-opt:has-text("Переработка сельхозпродукции")');
    await page.click('.quiz-opt:has-text("Более 3 лет")');
    await page.click('.quiz-opt:has-text("Областной центр")');
    await page.click('.quiz-opt:has-text("100 – 500 млн")');

    const card = page.locator('.result-card').filter({
      has: page.locator('.rc-title', { hasText: /^Агробизнес 2\.0$/ })
    });
    const termValue = await card.locator('.rc-stat-v').filter({ hasText: /мес/ }).textContent();
    expect(termValue).toMatch(/12 мес/);
  });
});

test.describe('Стресс-тест (Fajr-lite)', () => {
  test('форма стресс-теста доступна для Игілік с выбором животного', async ({ page }) => {
    await page.goto('/');
    await page.click('button:has-text("Начать подбор")');
    await page.click('.quiz-opt:has-text("Покупка скота")');
    await page.click('.quiz-opt:has-text("Более 3 лет")');
    await page.click('.quiz-opt:has-text("100 – 500 млн")');
    await page.locator('.quiz-opt[data-key="animalType"][data-value="KRS"]').click();
    await page.click('.quiz-opt:has-text("Импортное племенное поголовье")');
    await page.click('.quiz-opt:has-text("100 – 499 голов")');

    const card = page.locator('.result-card').filter({ hasText: /Игілік|Береке/ }).first();
    await card.locator('button:has-text("Подать заявку")').click();

    await expect(page.locator('.stress-title')).toContainText('дохода');
    await expect(page.locator('select[data-stress="animalType"]')).toBeVisible();
  });

  test('стресс-тест выдаёт вердикт после ввода данных', async ({ page }) => {
    await page.goto('/');
    await page.click('button:has-text("Начать подбор")');
    await page.click('.quiz-opt:has-text("Покупка скота")');
    await page.click('.quiz-opt:has-text("Более 3 лет")');
    await page.click('.quiz-opt:has-text("100 – 500 млн")');
    await page.locator('.quiz-opt[data-key="animalType"][data-value="KRS"]').click();
    await page.click('.quiz-opt:has-text("Импортное племенное поголовье")');
    await page.click('.quiz-opt:has-text("100 – 499 голов")');

    await page.locator('.result-card').filter({ hasText: /Игілік|Береке/ }).first()
      .locator('button:has-text("Подать заявку")').click();

    await page.fill('input[data-stress="existingHerd"]', '50');
    await page.fill('input[data-stress="plannedHerd"]', '100');
    await page.fill('input[data-stress="pasturesHa"]', '500');
    await page.fill('input[data-stress="barnSqm"]', '1500');
    await page.click('button:has-text("Рассчитать")');

    await expect(page.locator('.stress-verdict-title')).toBeVisible();
    await expect(page.locator('.stress-metric').first()).toBeVisible();
  });
});

test.describe('Форма обратной связи', () => {
  async function goToCallback(page) {
    await page.goto('/');
    await page.click('button:has-text("Начать подбор")');
    await page.click('.quiz-opt:has-text("Микрокредит, стартап")');
    await page.click('.quiz-opt:has-text("Услуги, торговля, прочее")');
    await page.click('.quiz-opt:has-text("Только открываюсь")');
    await page.click('.quiz-opt:has-text("Село")');
    await page.click('.quiz-opt:has-text("До 20 млн")');
    await page.locator('.result-card').filter({ hasText: 'Іскер' }).first()
      .locator('button:has-text("Подать заявку")').click();
  }

  test('блок «удобное время» убран, есть подсказка про рабочее время', async ({ page }) => {
    await goToCallback(page);
    // Не должно быть селектора времени и связанных chip-кнопок.
    await expect(page.locator('[data-cb-tm]')).toHaveCount(0);
    await expect(page.locator('label:has-text("Удобное время")')).toHaveCount(0);
    await expect(page.locator('.callback-hint')).toContainText(/рабочее время|пн.{1,5}пт/i);
  });

  test('маска телефона форматирует ввод и блокирует буквы', async ({ page }) => {
    await goToCallback(page);
    const phone = page.locator('input[data-cb-phone]');
    await phone.focus();
    await page.keyboard.type('77001234567', { delay: 15 });
    await expect(phone).toHaveValue('+7 (700) 123-45-67');

    // Попытка ввести буквы — не должна попасть в значение.
    await page.keyboard.press('End');
    await page.keyboard.press('a');
    await expect(phone).toHaveValue('+7 (700) 123-45-67');
  });

  test('маска нормализует ввод 8XXX… к +7', async ({ page }) => {
    await goToCallback(page);
    const phone = page.locator('input[data-cb-phone]');
    await phone.focus();
    await page.keyboard.type('87001234567', { delay: 15 });
    await expect(phone).toHaveValue('+7 (700) 123-45-67');
  });

  test('валидация: неполный телефон не отправляется', async ({ page }) => {
    await goToCallback(page);
    await page.fill('input[data-cb="name"]', 'Бауыржан');
    const phone = page.locator('input[data-cb-phone]');
    await phone.focus();
    await page.keyboard.type('77001234', { delay: 15 });
    await page.click('#submit-btn');
    await expect(page.locator('#submit-btn')).toContainText(/Введите телефон/);
  });
});

test.describe('Тупик подбора — индивидуальная консультация', () => {
  // Микрокредит обслуживает только Іскер (лимит 100 млн). Сумма свыше лимита →
  // ни одна программа не проходит → экран «не нашлось». Лид не должен теряться.
  async function reachDeadEnd(page) {
    await page.goto('/');
    await page.click('button:has-text("Начать подбор")');
    await page.click('.quiz-opt:has-text("Микрокредит, стартап")');
    await page.click('.quiz-opt:has-text("Услуги, торговля, прочее")');
    await page.click('.quiz-opt:has-text("Только открываюсь")');
    await page.click('.quiz-opt:has-text("Областной центр")');
    await page.click('.quiz-opt:has-text("100 – 500 млн")');
  }

  test('экран «не нашлось» показывает кнопку консультации', async ({ page }) => {
    await reachDeadEnd(page);
    await expect(page.locator('#results-section')).toContainText('Подходящих программ не нашлось');
    await expect(page.locator('button:has-text("Получить консультацию менеджера")')).toBeVisible();
  });

  test('консультация без программы → форма → отправка → «Заявка принята»', async ({ page }) => {
    await reachDeadEnd(page);
    await page.click('button:has-text("Получить консультацию менеджера")');

    // Форма открывается без выбранной программы — обобщённый блок вместо названия.
    await expect(page.locator('.callback-summary-t')).toContainText('Индивидуальная консультация');

    await page.fill('input[data-cb="name"]', 'Бауыржан');
    const phone = page.locator('input[data-cb-phone]');
    await phone.focus();
    await page.keyboard.type('77001234567', { delay: 15 });
    await page.click('#submit-btn');

    await expect(page.locator('.success-title')).toContainText('Заявка принята');
  });
});

test.describe('Объяснимость подбора — разбор процента совпадения', () => {
  test('разбор раскрывается и показывает засчитанные факторы', async ({ page }) => {
    await page.goto('/');
    await page.click('button:has-text("Начать подбор")');
    await page.click('.quiz-opt:has-text("Весенне-полевые и уборочные работы")');
    await page.click('.quiz-opt:has-text("Более 3 лет")');
    await page.click('.quiz-opt:has-text("100 – 500 млн")');

    const why = page.locator('.result-card').first().locator('.rc-why');
    await expect(why.locator('summary')).toContainText(/Почему совпадение \d+%/);
    // По умолчанию свёрнут — строки разбора скрыты, после клика видны.
    await expect(why.locator('.rc-why-row').first()).toBeHidden();
    await why.locator('summary').click();
    await expect(why.locator('.rc-why-row').first()).toBeVisible();
    // У карточки на 100% все пункты подходят — частичных (warn) строк нет.
    await expect(why.locator('.rc-why-row.warn')).toHaveCount(0);
  });

  test('при неполном совпадении подсказывает, какой ответ повысил бы совпадение', async ({ page }) => {
    await page.goto('/');
    await page.click('button:has-text("Начать подбор")');
    await page.click('.quiz-opt:has-text("Весенне-полевые и уборочные работы")');
    await page.click('.quiz-opt:has-text("1 – 3 года")');
    await page.click('.quiz-opt:has-text("100 – 500 млн")');

    const card = page.locator('.result-card').first();
    // Опыт «1 – 3 года» даёт +20 из +40 — итог 80%, а не 100%.
    await expect(card.locator('.rc-match')).toContainText('80%');
    const why = card.locator('.rc-why');
    await why.locator('summary').click();
    const expRow = why.locator('.rc-why-row').filter({ hasText: 'Опыт' });
    await expect(expRow).toContainText('1 – 3 года');
    await expect(expRow).toHaveClass(/warn/);
    await expect(expRow.locator('.rc-why-sub')).toContainText('Более 3 лет');
  });
});
