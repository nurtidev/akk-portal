// API-клиент для Go-бэкенда
// Все защищённые запросы используют Bearer-токен из localStorage
// При 401 — очищаем сессию и перенаправляем на /login

import { getToken, clearToken } from './auth';

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:8080';

// ── Типы ──────────────────────────────────────────────────────────────────────

export interface AppDocument {
  requirement_key: string;
  title: string;
  status: string;
  file_name: string | null;
  uploaded_at: string | null;
}

export interface AppListItem {
  uid: string;
  number: string;
  status: string;
  status_label: string;
  program_id: string;
  program_title: string;
  purpose: string;
  amount: number;
  client_name: string;
  client_phone: string;
  client_iin: string;
  admin_comment: string;
  created_at: string;
}

export interface AppDetail extends AppListItem {
  onboarding: unknown;
  is_terminal: boolean;
  next_status?: string;
  next_label?: string;
  documents: AppDocument[];
}

export interface Stats {
  by_status: Record<string, number>;
  total: number;
}

export interface LoginResponse {
  accessToken: string;
  name: string;
  role: 'admin';
}

// ── Ошибка неавторизованного запроса ─────────────────────────────────────────

export class UnauthorizedError extends Error {
  constructor() {
    super('Сессия истекла. Пожалуйста, войдите снова.');
    this.name = 'UnauthorizedError';
  }
}

// ── Базовый fetch с авторизацией ──────────────────────────────────────────────

async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (res.status === 401) {
    clearToken();
    // Перенаправляем на страницу логина
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
    throw new UnauthorizedError();
  }

  if (!res.ok) {
    let message = `Ошибка ${res.status}`;
    try {
      const body = (await res.json()) as { message?: string };
      if (body.message) message = body.message;
    } catch {
      // игнорируем ошибку парсинга
    }
    throw new Error(message);
  }

  return res.json() as Promise<T>;
}

// ── Аутентификация ────────────────────────────────────────────────────────────

/** Войти в систему. При ошибке 401 бросает Error с полем message */
export async function loginApi(
  username: string,
  password: string
): Promise<LoginResponse> {
  const res = await fetch(`${API_BASE}/api/v1/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });

  if (!res.ok) {
    let message = 'Неверный логин или пароль';
    try {
      const body = (await res.json()) as { message?: string };
      if (body.message) message = body.message;
    } catch {
      // игнорируем ошибку парсинга
    }
    throw new Error(message);
  }

  return res.json() as Promise<LoginResponse>;
}

// ── Заявки ────────────────────────────────────────────────────────────────────

/** Получить список заявок (с опциональной фильтрацией по статусу) */
export async function listApplications(status?: string): Promise<{
  applications: AppListItem[];
  total: number;
}> {
  const params = status ? `?status=${encodeURIComponent(status)}` : '';
  return apiFetch(`/api/v1/admin/applications${params}`);
}

/** Получить детали конкретной заявки */
export async function getApplication(uid: string): Promise<AppDetail> {
  return apiFetch(`/api/v1/admin/applications/${uid}`);
}

// ── Решения по заявкам ────────────────────────────────────────────────────────

export type DecisionAction = 'advance' | 'reject' | 'rework' | 'set';

export interface DecisionPayload {
  action: DecisionAction;
  status?: string;
  comment?: string;
}

/** Принять решение по заявке */
export async function decide(
  uid: string,
  payload: DecisionPayload
): Promise<AppDetail> {
  return apiFetch(`/api/v1/admin/applications/${uid}/decision`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

// ── Статистика ────────────────────────────────────────────────────────────────

/** Получить агрегированную статистику по статусам */
export async function getStats(): Promise<Stats> {
  return apiFetch('/api/v1/admin/stats');
}
