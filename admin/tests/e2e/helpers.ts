import type { Page } from '@playwright/test';

// Адрес реального Go-бэкенда, поднятого для E2E (должен совпадать с тем, что
// зашит в сборку фронта через NEXT_PUBLIC_API_BASE в playwright.config.ts).
const API = process.env.E2E_API_BASE ?? 'http://localhost:8081';

const ADMIN_USER = 'admin';
const ADMIN_PASS = 'akk-admin-2026';

/** Получить admin-токен напрямую через API (для программного входа в тестах). */
export async function adminToken(): Promise<string> {
  const r = await fetch(`${API}/api/v1/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: ADMIN_USER, password: ADMIN_PASS }),
  });
  if (!r.ok) throw new Error(`admin login failed: ${r.status}`);
  const d = (await r.json()) as { accessToken: string };
  return d.accessToken;
}

/** Демо-вход заёмщика (eGov/Baiterek) — нужен, чтобы создать заявку от его имени. */
async function clientToken(provider = 'egov'): Promise<string> {
  const r = await fetch(`${API}/api/v1/auth/Account/ssoDemoLogin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ provider }),
  });
  if (!r.ok) throw new Error(`client login failed: ${r.status}`);
  const d = (await r.json()) as { accessToken: string };
  return d.accessToken;
}

export interface SeededApp {
  uid: string;
  number: string;
}

/** Создать свежую заявку через API заёмщика. Каждый тест сеет свою — без коллизий. */
export async function seedApplication(opts: {
  amount?: number;
  purpose?: string;
  program?: string;
  provider?: string;
} = {}): Promise<SeededApp> {
  const tok = await clientToken(opts.provider ?? 'egov');
  const body = {
    requested_amount: opts.amount ?? 10_000_000,
    loan_purpose: opts.purpose ?? 'Демо-цель',
    program_id: opts.program ?? 'agrobusiness',
    onboarding: { region: 'Алматинская обл.', contact: '+7 701 000 00 00' },
  };
  const r = await fetch(`${API}/api/v1/credit/applications`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`create application failed: ${r.status}`);
  const d = (await r.json()) as { uid: string; number: string };
  return { uid: d.uid, number: d.number };
}

/** Программный вход в админку: кладём валидный токен в localStorage до загрузки страниц. */
export async function loginAsAdmin(page: Page): Promise<void> {
  const tok = await adminToken();
  await page.addInitScript(
    ([t]) => {
      localStorage.setItem('akk_admin_token', t);
      localStorage.setItem('akk_admin_name', 'admin');
    },
    [tok]
  );
}
