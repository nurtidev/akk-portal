// =====================================================
// ===== E2: Playwright config для нового Next.js-фронта
// Тесты воронки/контента переносятся с легаси-прототипа на /ru.
// Прод-сборка standalone: webServer поднимает `npm run start` на :3777.
// Оркестратор может предварительно собрать (`npm run build`) — reuseExistingServer
// подхватит уже запущенный сервер, поэтому конфиг универсален.
// =====================================================

import { defineConfig, devices } from '@playwright/test';

const PORT = 3777;
const BASE_URL = process.env.E2E_BASE_URL || `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './tests/e2e',
  // Папка для артефактов (скриншоты мобильного теста кладём сюда).
  outputDir: './test-results',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: 'list',

  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    // Все сценарии проверяем на русской локали — пути с префиксом /ru.
    locale: 'ru-RU',
  },

  projects: [
    {
      name: 'chromium',
      // Мобильный спек (бургер, скриншот 390×844) — только в проекте mobile.
      testIgnore: ['**/mobile.spec.ts'],
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 800 },
      },
    },
    {
      name: 'mobile',
      use: {
        // iPhone 14 — viewport 390×844 (как в легаси mobile-screenshot.spec.js).
        // Движок принудительно chromium: webkit не устанавливаем (вьюпорт/touch
        // эмулируются, для наших проверок этого достаточно).
        ...devices['iPhone 14'],
        browserName: 'chromium',
      },
    },
  ],

  // Прод-сервер Next.js (standalone). PORT задаём явно — npm run start читает ${PORT}.
  webServer: {
    command: 'npm run start',
    url: BASE_URL,
    reuseExistingServer: true,
    timeout: 120_000,
    env: { PORT: String(PORT) },
  },
});
