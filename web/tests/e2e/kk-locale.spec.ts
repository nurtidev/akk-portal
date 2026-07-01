import { test, expect } from '@playwright/test';

test.use({ viewport: { width: 1280, height: 800 } });

test('kk: главная на казахском', async ({ page }) => {
  await page.goto('/kk');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('аграрлық бизнесті');
  await expect(page.getByRole('link', { name: 'Бағдарламалар' }).first()).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Қаражат сізге не үшін қажет?' })).toBeVisible();
});

test('kk: квиз на казахском — микрокредит до конца', async ({ page }) => {
  await page.goto('/kk');
  await page.getByRole('button', { name: 'Бағдарлама таңдау' }).first().click();
  await expect(page.getByRole('heading', { name: 'Нені қаржыландырғыңыз келеді?' })).toBeVisible();
  await page.getByRole('button', { name: /Микрокредит, стартап/ }).click();
  await expect(page.getByRole('heading', { name: 'Сіздің негізгі салаңыз?' })).toBeVisible();
  await page.getByRole('button', { name: 'Қызметтер, сауда, өзге' }).click();
  await expect(page.getByRole('heading', { name: 'Қызметіңізге қанша жыл болды?' })).toBeVisible();
  await page.getByRole('button', { name: '3 жылдан астам' }).click();
  await expect(page.getByRole('heading', { name: 'Қай жерде орналасқансыз?' })).toBeVisible();
  await page.getByRole('button', { name: 'Ауыл', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Қанша сома қажет?' })).toBeVisible();
  await page.getByRole('button', { name: '20 млн ₸-ге дейін' }).click();
  // Результаты: казахские подписи + «почему N%» с переведёнными факторами
  await expect(page.getByText(/сәйкес бағдарлама табылды/)).toBeVisible();
  await page.getByText(/Неліктен сәйкестік/).first().click();
  await expect(page.getByText(/Өңір: Ауыл/).first()).toBeVisible();
});

test('kk: квиз КРС — условные вопросы на казахском', async ({ page }) => {
  await page.goto('/kk');
  await page.getByRole('button', { name: 'Бағдарлама таңдау' }).first().click();
  await page.getByRole('button', { name: /Мал сатып алу/ }).click();
  await expect(page.getByRole('heading', { name: 'Қызметіңізге қанша жыл болды?' })).toBeVisible();
  await page.getByRole('button', { name: '1 – 3 жыл' }).click();
  await expect(page.getByRole('heading', { name: 'Қанша сома қажет?' })).toBeVisible();
  await page.getByRole('button', { name: '20 – 100 млн ₸' }).click();
  await expect(page.getByRole('heading', { name: 'Қандай мал түрін сатып алуды жоспарлайсыз?' })).toBeVisible();
  await page.getByRole('button', { name: /Ірі қара мал — ет немесе сүт/ }).click();
  // Вопрос про импорт/отечественный убран — после выбора КРС сразу спрашиваем голов.
  await expect(page.getByRole('heading', { name: 'Қанша бас сатып алуды жоспарлайсыз?' })).toBeVisible();
  await page.getByRole('button', { name: '100 – 499 бас' }).click();
  await expect(page.getByText(/сәйкес бағдарлама табылды/)).toBeVisible();
});
