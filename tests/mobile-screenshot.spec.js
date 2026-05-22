// @ts-check
const { test } = require('@playwright/test');

test.use({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1'
});

// fullPage: false — только то, что видно на экране при загрузке.
test('mobile viewport — landing top', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: 'test-results/m-1-hero.png', fullPage: false });
});

test('mobile viewport — quiz', async ({ page }) => {
  await page.goto('/');
  await page.click('button:has-text("Начать подбор")');
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'test-results/m-2-quiz.png', fullPage: false });
});

test('mobile viewport — result card (top)', async ({ page }) => {
  await page.goto('/');
  await page.click('button:has-text("Начать подбор")');
  await page.click('.quiz-opt:has-text("Покупка племенного скота")');
  await page.click('.quiz-opt:has-text("Более 3 лет")');
  await page.click('.quiz-opt:has-text("Село")');
  await page.click('.quiz-opt:has-text("100 – 500 млн")');
  await page.locator('.quiz-opt[data-key="animalType"][data-value="KRS"]').click();
  await page.click('.quiz-opt:has-text("100 – 499 голов")');
  await page.waitForTimeout(500);
  // Скроллим к первой карточке
  await page.locator('.result-card').first().scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'test-results/m-3-result-card.png', fullPage: false });
});

test('mobile viewport — result stats (label сверху, value снизу)', async ({ page }) => {
  await page.goto('/');
  await page.click('button:has-text("Начать подбор")');
  await page.click('.quiz-opt:has-text("Покупка племенного скота")');
  await page.click('.quiz-opt:has-text("Более 3 лет")');
  await page.click('.quiz-opt:has-text("Село")');
  await page.click('.quiz-opt:has-text("100 – 500 млн")');
  await page.locator('.quiz-opt[data-key="animalType"][data-value="KRS"]').click();
  await page.click('.quiz-opt:has-text("100 – 499 голов")');
  await page.waitForTimeout(300);
  await page.locator('.result-card').first().locator('.rc-stats').scrollIntoViewIfNeeded();
  await page.screenshot({
    path: 'test-results/m-4-stats.png',
    clip: await page.locator('.result-card').first().boundingBox().then(b => ({
      x: b.x, y: b.y, width: b.width, height: 200
    }))
  });
});

test('mobile viewport — callback form (mask + hint)', async ({ page }) => {
  await page.goto('/');
  await page.click('button:has-text("Начать подбор")');
  await page.click('.quiz-opt:has-text("Микрокредит, стартап")');
  await page.click('.quiz-opt:has-text("Услуги, торговля, прочее")');
  await page.click('.quiz-opt:has-text("Только открываюсь")');
  await page.click('.quiz-opt:has-text("Село")');
  await page.click('.quiz-opt:has-text("До 20 млн")');
  await page.locator('.result-card').filter({ hasText: 'Іскер' }).first()
    .locator('button:has-text("Подать заявку")').click();
  await page.waitForTimeout(400);
  await page.locator('input[data-cb-phone]').focus();
  await page.locator('input[data-cb-phone]').type('77001234567', { delay: 10 });
  await page.screenshot({ path: 'test-results/m-5-callback.png', fullPage: false });
});
