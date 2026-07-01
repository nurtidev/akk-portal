import { test, expect } from '@playwright/test';
import { loginAsAdmin, seedSupportQuestion } from './helpers';

// =====================================================
// Трек K — раздел «Обращения» в админке.
// Обращение из блока «Не нашли ответ?» на сайте должно появиться в списке,
// помечаться решённым и попадать под фильтр «Решённые».
// =====================================================

test.describe('Админка: обращения из FAQ', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('обращение видно в списке, помечается решённым и фильтруется', async ({ page }) => {
    // Уникальный текст — чтобы найти именно наше обращение среди прочих
    const marker = `E2E вопрос ${Date.now()}`;
    await seedSupportQuestion(marker, 'program-agrobusiness');

    await page.goto('/questions');

    // Карточка с нашим вопросом видна, источник — программа
    const card = page.locator('.card', { hasText: marker });
    await expect(card).toBeVisible();
    await expect(card.getByText(/Программа: agrobusiness/)).toBeVisible();
    await expect(card.getByText('Новое')).toBeVisible();

    // Помечаем решённым
    await card.getByRole('button', { name: 'Пометить решённым' }).click();

    // Статус в карточке стал «Решено»
    await expect(card.getByText('Решено')).toBeVisible();

    // Фильтр «Решённые» показывает наше обращение
    await page.getByRole('button', { name: /Решённые/ }).click();
    await expect(page.locator('.card', { hasText: marker })).toBeVisible();
  });
});
