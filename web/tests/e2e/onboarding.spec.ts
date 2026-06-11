// =====================================================
// ===== E2: Онбординг — порт легаси tests/onboarding.spec.js на /ru
// Источник сценариев: ../../tests/onboarding.spec.js (корень репо).
// Тексты вариантов квиза — web/src/data/questions.ts;
// названия программ — web/src/data/programs.ts;
// подписи кнопок/заголовков — web/messages/ru/funnel.json.
// Селекторы — по ролям и видимым текстам (устойчивы к стилям).
// Задержку автоперехода квиза (~180мс) ждём через видимость заголовка, без sleep.
// =====================================================

import { test, expect, type Page } from '@playwright/test';

// Этот файл целиком про десктоп-флоу.
test.use({ viewport: { width: 1280, height: 800 } });

// --- Хелперы ------------------------------------------------------------

/** Открыть главную (/ru) и дождаться hero. */
async function openHome(page: Page) {
  await page.goto('/ru');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
}

/** Запустить квиз с лендинга — кнопка «Подобрать программу» в hero. */
async function startQuiz(page: Page) {
  await page.getByRole('button', { name: 'Подобрать программу' }).click();
  // Первый вопрос квиза.
  await expect(
    page.getByRole('heading', { name: 'Что хотите профинансировать?' }),
  ).toBeVisible();
}

/** Кликнуть по варианту ответа (кнопка с видимым текстом-подписью варианта). */
async function pickOption(page: Page, label: string | RegExp) {
  await page.getByRole('button', { name: label }).first().click();
}

/** Дождаться, что показан вопрос с данным заголовком (учитывает задержку 180мс). */
async function expectQuestion(page: Page, title: string | RegExp) {
  await expect(page.getByRole('heading', { name: title })).toBeVisible();
}

/** Заголовок секции результатов (карточки программ). */
function resultsHeading(page: Page) {
  return page.getByRole('heading', { name: /Найдено \d+/ });
}

// Карточка-результат — самый глубокий div, содержащий и заголовок программы,
// и бейдж «% совпадение» (он же — корень карточки). .last() в пред-порядке DOM
// возвращает именно корень карточки, а не внешние обёртки списка.
function resultCard(page: Page, title: string | RegExp) {
  return page
    .locator('div')
    .filter({ has: page.getByRole('heading', { level: 3, name: title }) })
    .filter({ hasText: '% совпадение' })
    .last();
}

/** Топовая карточка — корень карточки с бейджем «Лучшее совпадение». */
function topCard(page: Page) {
  return page
    .locator('div')
    .filter({ has: page.getByRole('heading', { level: 3 }) })
    .filter({ hasText: 'Лучшее совпадение' })
    .last();
}

// --- 1. Лендинг ---------------------------------------------------------

test.describe('Лендинг — hero и сетка программ', () => {
  test('hero: заголовок «Финансирование» и стат «6 программ»', async ({ page }) => {
    await openHome(page);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Финансирование');
    // Стат «6 / Программ под цели АПК».
    await expect(page.getByText('Программ под цели АПК')).toBeVisible();
  });

  test('в превью-сетке видны все 6 прямых программ, «Кең дала» (indirect) скрыта', async ({
    page,
  }) => {
    await openHome(page);
    const grid = page.locator('#programs');
    const expectedTitles = [
      'Кең дала 2',
      'Агробизнес',
      'Игілік и Береке',
      'Іскер',
      'Откормплощадки и птицефабрики',
      'Агробизнес 2.0',
    ];
    for (const title of expectedTitles) {
      await expect(
        grid.getByRole('heading', { level: 3, name: new RegExp(`^${title}$`) }),
      ).toBeVisible();
    }
    // Скрытая программа «Кең дала» (без «2») — только в полном списке, не в превью.
    await expect(grid.getByRole('heading', { level: 3, name: /^Кең дала$/ })).toHaveCount(0);
  });
});

// --- 2. Семь сквозных квиз-сценариев -----------------------------------

test.describe('Квиз — 7 сквозных сценариев', () => {
  test.beforeEach(async ({ page }) => {
    await openHome(page);
    await startQuiz(page);
  });

  test('ВПРиУР → опыт 3+ → 100–500 млн → топ «Кең дала 2» 100%', async ({ page }) => {
    await pickOption(page, 'Весенне-полевые и уборочные работы');
    // sector скрыт (vprir → plant), сразу вопрос об опыте.
    await expectQuestion(page, 'Сколько лет ведёте деятельность?');
    await pickOption(page, 'Более 3 лет');
    await pickOption(page, /100 – 500 млн/);

    await expect(resultsHeading(page)).toBeVisible();
    await expect(topCard(page).getByRole('heading', { level: 3 })).toContainText('Кең дала 2');
    await expect(topCard(page)).toContainText('100% совпадение');
  });

  test('импортный КРС 100–499 голов → топ «Игілік и Береке»', async ({ page }) => {
    await pickOption(page, 'Покупка скота');
    await expectQuestion(page, 'Сколько лет ведёте деятельность?');
    await pickOption(page, 'Более 3 лет');
    await pickOption(page, /100 – 500 млн/);
    await pickOption(page, /КРС/);
    await pickOption(page, 'Импортное племенное поголовье');
    await pickOption(page, /100 – 499 голов/);

    await expect(resultsHeading(page)).toBeVisible();
    await expect(topCard(page).getByRole('heading', { level: 3 })).toContainText(/Игілік|Береке/);
  });

  test('импортный КРС 500+ голов → топ «Игілік и Береке»', async ({ page }) => {
    await pickOption(page, 'Покупка скота');
    await pickOption(page, 'Более 3 лет');
    await pickOption(page, /Более 500 млн/);
    await pickOption(page, /КРС/);
    await pickOption(page, 'Импортное племенное поголовье');
    await pickOption(page, /500 голов и более/);

    await expect(resultsHeading(page)).toBeVisible();
    await expect(topCard(page).getByRole('heading', { level: 3 })).toContainText(/Игілік|Береке/);
  });

  test('отечественный КРС → «Игілік» не подходит, fallback «Агробизнес»', async ({ page }) => {
    await pickOption(page, 'Покупка скота');
    await pickOption(page, 'Более 3 лет');
    await pickOption(page, /100 – 500 млн/);
    await pickOption(page, /КРС/);
    // Вопрос про импорт появляется только после выбора КРС.
    await expectQuestion(page, 'Импортное или отечественное поголовье?');
    await pickOption(page, 'Отечественный скот или обновление стада');
    await pickOption(page, /100 – 499 голов/);

    await expect(resultsHeading(page)).toBeVisible();
    const titles = await page.getByRole('heading', { level: 3 }).allTextContents();
    expect(titles).not.toContain('Игілік и Береке');
    expect(titles.some((t) => /Агробизнес/.test(t))).toBe(true);
  });

  test('микрокредит (село, до 20 млн) → топ «Іскер»', async ({ page }) => {
    await pickOption(page, 'Микрокредит, стартап');
    await pickOption(page, 'Услуги, торговля, прочее');
    await pickOption(page, 'Только открываюсь');
    await pickOption(page, /^Село$/);
    await pickOption(page, /До 20 млн/);

    await expect(resultsHeading(page)).toBeVisible();
    await expect(topCard(page).getByRole('heading', { level: 3 })).toContainText('Іскер');
  });

  test('откорм/птицеводство → топ «Откормплощадки и птицефабрики»', async ({ page }) => {
    await pickOption(page, 'Откорм или птицеводство');
    // sector скрыт (feedlot → poultry), сразу опыт.
    await expectQuestion(page, 'Сколько лет ведёте деятельность?');
    await pickOption(page, 'Более 3 лет');
    // feedlot входит в REGION_PURPOSES — спрашивается регион.
    await pickOption(page, /Малый город/);
    await pickOption(page, /100 – 500 млн/);

    await expect(resultsHeading(page)).toBeVisible();
    await expect(topCard(page).getByRole('heading', { level: 3 })).toContainText('Откормплощадки');
  });

  test('инвестиции (переработка, 500+ млн) → топ «Агробизнес»', async ({ page }) => {
    await pickOption(page, 'Инвестиции, покупка основных средств');
    // sector НЕ скипается для investments — спрашивается отрасль.
    await expectQuestion(page, 'Ваша основная отрасль?');
    await pickOption(page, 'Переработка сельхозпродукции');
    await pickOption(page, 'Более 3 лет');
    await pickOption(page, /Более 500 млн/);

    await expect(resultsHeading(page)).toBeVisible();
    await expect(topCard(page).getByRole('heading', { level: 3 })).toContainText(/Агробизнес/);
  });

  test('кнопка «Назад» возвращает на предыдущий шаг (учёт скипа sector)', async ({ page }) => {
    await pickOption(page, 'Весенне-полевые и уборочные работы');
    await expectQuestion(page, 'Сколько лет ведёте деятельность?');
    await page.getByRole('button', { name: /Назад/ }).click();
    // Назад с «Опыт» — на «Цель» (sector скрыт), а не на отрасль.
    await expectQuestion(page, 'Что хотите профинансировать?');
  });
});

// --- 3. Калькулятор -----------------------------------------------------

test.describe('Калькулятор — графики и сроки', () => {
  test('«Кең дала 2» — двухплатёжный график (05 декабря / 05 марта)', async ({ page }) => {
    await openHome(page);
    await startQuiz(page);
    await pickOption(page, 'Весенне-полевые и уборочные работы');
    await pickOption(page, 'Более 3 лет');
    await pickOption(page, /100 – 500 млн/);

    await expect(resultsHeading(page)).toBeVisible();
    const card = topCard(page);
    await expect(card.getByText('График погашения — два платежа')).toBeVisible();
    await expect(card.getByText('05 декабря', { exact: true })).toBeVisible();
    await expect(card.getByText('05 марта', { exact: true })).toBeVisible();
  });

  test('«Игілік и Береке» — ставка 6%, срок до 84 мес', async ({ page }) => {
    await openHome(page);
    await startQuiz(page);
    await pickOption(page, 'Покупка скота');
    await pickOption(page, 'Более 3 лет');
    await pickOption(page, /100 – 500 млн/);
    await pickOption(page, /КРС/);
    await pickOption(page, 'Импортное племенное поголовье');
    await pickOption(page, /100 – 499 голов/);

    await expect(resultsHeading(page)).toBeVisible();
    const card = resultCard(page, /Игілік|Береке/);
    // Стат-блок «ставка / сумма до / срок до». Без rateRange ставка рисуется как «от 6%».
    await expect(card.getByText('от 6%', { exact: true }).first()).toBeVisible();
    // «84 мес» встречается и в стат-блоке, и в scheduleNote — берём первое вхождение.
    await expect(card.getByText('84 мес').first()).toBeVisible();
    // Срок зафиксирован у biannual — у Игілік annual, поэтому кнопки сроков есть;
    // 84 — максимум, кнопки свыше 84 быть не должно.
    await expect(card.getByRole('button', { name: '120 мес' })).toHaveCount(0);
  });

  test('«Агробизнес» с целью ПОС — потолок срока 48 мес', async ({ page }) => {
    await openHome(page);
    await startQuiz(page);
    await pickOption(page, 'Пополнение оборотных средств');
    // working НЕ скипает sector — спрашивается отрасль.
    await expectQuestion(page, 'Ваша основная отрасль?');
    await pickOption(page, 'Переработка сельхозпродукции');
    await pickOption(page, 'Более 3 лет');
    // working входит в REGION_PURPOSES — спрашивается регион.
    await pickOption(page, /Областной центр/);
    await pickOption(page, /100 – 500 млн/);

    await expect(resultsHeading(page)).toBeVisible();
    // Именно «Агробизнес», не «Агробизнес 2.0» (у 2.0 ПОС ограничен 12 мес).
    const card = resultCard(page, /^Агробизнес$/);
    // «48 мес» — потолок срока в стат-блоке (встречается также в примечаниях → .first()).
    await expect(card.getByText('48 мес').first()).toBeVisible();
    // Кнопка срока 60 мес недоступна (превышает потолок 48 для ПОС).
    await expect(card.getByRole('button', { name: '60 мес' })).toHaveCount(0);
  });
});

// --- 4. Стресс-тест (Fajr-lite) ----------------------------------------

test.describe('Стресс-тест — Игілік', () => {
  /** Пройти квиз до результатов с топом Игілік и нажать «Подать заявку →». */
  async function reachStress(page: Page) {
    await openHome(page);
    await startQuiz(page);
    await pickOption(page, 'Покупка скота');
    await pickOption(page, 'Более 3 лет');
    await pickOption(page, /100 – 500 млн/);
    await pickOption(page, /КРС/);
    await pickOption(page, 'Импортное племенное поголовье');
    await pickOption(page, /100 – 499 голов/);
    await expect(resultsHeading(page)).toBeVisible();
    // «Подать заявку →» у карточки Игілік ведёт на стресс-тест (hasStressTest).
    await resultCard(page, /Игілік|Береке/)
      .getByRole('button', { name: 'Подать заявку' })
      .click();
    await expect(page.getByRole('heading', { name: 'Хватит ли дохода на платежи?' })).toBeVisible();
  }

  test('форма стресс-теста: заголовок + селектор вида животных', async ({ page }) => {
    await reachStress(page);
    // Селектор «Вид животных» — combobox.
    const animal = page.getByRole('combobox');
    await expect(animal).toBeVisible();
    // По умолчанию выбран КРС (см. funnel-state).
    await expect(animal).toContainText('КРС');
  });

  test('ввод данных → вердикт + метрики', async ({ page }) => {
    await reachStress(page);
    // Поля без htmlFor — адресуем по плейсхолдеру (NUMERIC_FIELDS в stress-test.tsx).
    await page.getByPlaceholder('например, 50').fill('50'); // existingHerd
    await page.getByPlaceholder('например, 200').fill('100'); // plannedHerd
    await page.getByPlaceholder('например, 300').fill('500'); // pasturesHa
    await page.getByPlaceholder('например, 1500').fill('1500'); // barnSqm
    await page.getByRole('button', { name: 'Рассчитать' }).click();

    // Появилась метрика «Платёж от дохода» — признак отрисованного вердикта.
    await expect(page.getByText('Платёж от дохода')).toBeVisible();
    await expect(page.getByText('Ожидаемый чистый доход')).toBeVisible();
    // Кнопка пересчёта заменяет «Рассчитать».
    await expect(page.getByRole('button', { name: 'Пересчитать' })).toBeVisible();
  });

  test('«Пропустить и подать заявку» ведёт дальше (к визарду)', async ({ page }) => {
    await reachStress(page);
    await page.getByRole('button', { name: 'Пропустить и подать заявку' }).click();
    // Визард заявки — заголовок-eyebrow «Заявка на кредит».
    await expect(page.getByText('Заявка на кредит')).toBeVisible();
  });
});

// --- 5. Объяснимость подбора -------------------------------------------

test.describe('Объяснимость — «Почему совпадение N%»', () => {
  test('раскрывашка открывается и показывает факторы', async ({ page }) => {
    await openHome(page);
    await startQuiz(page);
    await pickOption(page, 'Весенне-полевые и уборочные работы');
    await pickOption(page, 'Более 3 лет');
    await pickOption(page, /100 – 500 млн/);

    await expect(resultsHeading(page)).toBeVisible();
    const why = topCard(page).locator('details').first();
    const summary = why.locator('summary');
    await expect(summary).toContainText(/Почему совпадение \d+%/);
    // Раскрываем — внутри появляются строки-факторы (с пояснением «подходит программе»).
    await summary.click();
    await expect(why.getByText('этот ответ подходит программе').first()).toBeVisible();
  });

  test('при неполном совпадении факторы подсказывают лучший ответ', async ({ page }) => {
    await openHome(page);
    await startQuiz(page);
    await pickOption(page, 'Весенне-полевые и уборочные работы');
    // Опыт «1 – 3 года» даёт меньше веса → совпадение ниже 100%.
    await pickOption(page, /1 – 3 года/);
    await pickOption(page, /100 – 500 млн/);

    await expect(resultsHeading(page)).toBeVisible();
    const card = topCard(page);
    const why = card.locator('details').first();
    await why.locator('summary').click();
    // Есть подсказка «выше совпадение при ответе ...» (недобор по фактору).
    await expect(why.getByText(/выше совпадение при ответе/).first()).toBeVisible();
  });
});
