import { defineConfig, devices } from '@playwright/test';

// E2E против реального Go-бэкенда (поднятого отдельно) + собранного admin-приложения.
// NEXT_PUBLIC_API_BASE инлайнится на build-time, поэтому webServer пересобирает фронт
// с нужным адресом бэкенда (E2E_API_BASE) и поднимает next start на :3001.
const API_BASE = process.env.E2E_API_BASE ?? 'http://localhost:8081';
const PORT = 3001;

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 30_000,
  expect: { timeout: 7_000 },
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: `NEXT_PUBLIC_API_BASE=${API_BASE} npm run build && PORT=${PORT} npm run start`,
    url: `http://localhost:${PORT}`,
    timeout: 180_000,
    reuseExistingServer: false,
  },
});
