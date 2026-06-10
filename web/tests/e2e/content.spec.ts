// =====================================================
// ===== E2: Контентные разделы + навигация + форма блога
// Источник текстов: web/messages/ru/content.json и common.json.
// Все пути с префиксом /ru (localePrefix=always).
// =====================================================

import { test, expect } from '@playwright/test';

test.use({ viewport: { width: 1280, height: 800 } });

// --- Контент страниц ----------------------------------------------------

test.describe('Контентные страницы', () => {
  test('/ru/about — есть председатель СД «Айдапкелов»', async ({ page }) => {
    await page.goto('/ru/about');
    // Имя из content.json → structure.boardMembers[0].name.
    await expect(page.getByText(/Айдапкелов/)).toBeVisible();
  });

  test('/ru/investors — рейтинг Moody’s «Baa2», без «S&P»', async ({ page }) => {
    await page.goto('/ru/investors');
    await expect(page.getByText(/Baa2/)).toBeVisible();
    // S&P в данных нет (только Fitch + Moody’s) — на странице не должно встречаться.
    await expect(page.getByText('S&P')).toHaveCount(0);
  });

  test('/ru/how-to-get — 7 этапов получения кредита', async ({ page }) => {
    await page.goto('/ru/how-to-get');
    // Подзаголовок прямо называет число шагов.
    await expect(page.getByText(/7 шагов/)).toBeVisible();
    // Все 7 заголовков этапов (content.json → howToGet.steps[*].title).
    const stepTitles = [
      'Подготовка бизнес-идеи',
      'Сбор документации',
      'Подача заявления',
      'Проверка документов',
      'Принятие решения',
      'Договорное оформление',
      'Финансирование',
    ];
    for (const title of stepTitles) {
      await expect(page.getByRole('heading', { name: title, exact: true }).first()).toBeVisible();
    }
  });

  test('/ru/contacts — единый колл-центр «1408»', async ({ page }) => {
    await page.goto('/ru/contacts');
    await expect(page.getByText('1408').first()).toBeVisible();
  });
});

// --- Навигация ----------------------------------------------------------

test.describe('Навигация в шапке', () => {
  test('дропдаун «О корпорации» открывается и ведёт на /ru/about', async ({ page }) => {
    await page.goto('/ru');
    // Кнопка-триггер выпадающего меню (aria-haspopup=menu).
    await page.getByRole('button', { name: 'О корпорации' }).click();
    // Пункт «О компании» в меню.
    const aboutLink = page.getByRole('menuitem', { name: 'О компании' });
    await expect(aboutLink).toBeVisible();
    await aboutLink.click();
    await expect(page).toHaveURL(/\/ru\/about$/);
  });

  test('переключатель языка ru → kk меняет URL на /kk', async ({ page }) => {
    await page.goto('/ru/about');
    // Триггер языка: видимый текст «Рус», но accessible name = aria-label «Язык».
    await page.getByRole('button', { name: 'Язык' }).click();
    // Опция «Қаз» в списке.
    await page.getByRole('option', { name: /Қаз/ }).click();
    await expect(page).toHaveURL(/\/kk\/about$/);
  });
});

// --- Форма блога (мок) --------------------------------------------------

test.describe('Блог председателя — форма вопроса', () => {
  test('заполнить, отправить, увидеть сообщение успеха', async ({ page }) => {
    await page.goto('/ru/blog');

    // Поля формы — по плейсхолдерам/лейблам (BlogQuestionForm, id blog-name/contact/message).
    await page.locator('#blog-name').fill('Бауыржан');
    await page.locator('#blog-contact').fill('+7 700 123 45 67');
    await page.locator('#blog-message').fill('Когда снизят ставку по программе Іскер?');

    await page.getByRole('button', { name: 'Отправить' }).click();

    // Мок-отправка показывает сообщение успеха (content.json → blog.form.successMessage).
    await expect(
      page.getByText('Ваше обращение принято. Мы ответим в ближайшее время.'),
    ).toBeVisible();
  });
});
