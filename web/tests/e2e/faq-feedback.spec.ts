import { test, expect } from '@playwright/test';

// =====================================================
// Трек K — «Полезен ли ответ?» + «Не нашли ответ?»
// Проверяем клиентские островки на вкладке «Вопросы» страницы продукта:
//   1) голос 👍 → «Спасибо за отзыв!» + строка «N% … нашли ответ полезным»;
//   2) форма «Не нашли ответ?» → обращение уходит на бэкенд (успех).
// Требует поднятого Go-бэкенда (NEXT_PUBLIC_API_BASE вшит в сборку) — иначе
// голос/обращение деградируют. Запускается вместе с backend-стеком (см. скрипт E2E).
// =====================================================

test.describe('FAQ: полезность ответа и обращение в поддержку', () => {
  test('голос за ответ показывает благодарность и процент', async ({ page }) => {
    await page.goto('/ru/products/agrobusiness');

    // Переходим на вкладку «Вопросы»
    await page.getByRole('tab', { name: 'Вопросы' }).click();
    const panel = page.locator('#panel-faq');
    await expect(panel).toBeVisible();

    // Раскрываем первый вопрос (нативный details/summary)
    const firstItem = panel.locator('details').first();
    await firstItem.locator('summary').click();

    // Блок оценки виден
    await expect(firstItem.getByText('Полезен ли ответ?')).toBeVisible();

    // Голосуем «Да»
    await firstItem.getByRole('button', { name: 'Да' }).click();

    // Появляется благодарность и агрегат «N% … нашли ответ полезным»
    await expect(firstItem.getByText('Спасибо за отзыв!')).toBeVisible();
    await expect(firstItem.getByText(/нашли ответ полезным/)).toBeVisible();
  });

  test('форма «Не нашли ответ?» отправляет вопрос в поддержку', async ({ page }) => {
    await page.goto('/ru/products/agrobusiness');
    await page.getByRole('tab', { name: 'Вопросы' }).click();
    const panel = page.locator('#panel-faq');

    // Раскрываем форму
    await panel.getByRole('button', { name: 'Задать вопрос' }).click();

    // Заполняем и отправляем
    await panel.getByLabel('Ваш вопрос').fill('E2E: остались вопросы по срокам погашения');
    await panel.getByRole('button', { name: 'Отправить вопрос' }).click();

    // Успех
    await expect(panel.getByText(/отправлен в поддержку/)).toBeVisible();
  });
});
