// =====================================================
// ===== D1: HTTP-обёртка над fetch ====================
// Единый формат ответа { ok, status, data }, Bearer-заголовок,
// мягкая ошибка ApiUnavailable, когда NEXT_PUBLIC_API_BASE не задан.
// =====================================================

import { API_BASE, apiAvailable } from "./config";
import { accessToken } from "./tokens";

/** Унифицированный результат запроса. */
export interface ApiResult<T = unknown> {
  /** true → HTTP 2xx. */
  ok: boolean;
  /** HTTP-статус; 0 — сетевая ошибка; -1 — бэкенд не сконфигурирован. */
  status: number;
  /** Разобранное тело (JSON или строка), либо null. */
  data: T | null;
  /** true → клиент недоступен (нет NEXT_PUBLIC_API_BASE) — UI идёт в demo-fallback. */
  unavailable?: boolean;
}

export interface HttpOptions {
  method?: "GET" | "POST";
  /** Тело — будет сериализовано в JSON. */
  body?: unknown;
  /** Добавить Authorization: Bearer <accessToken>. */
  auth?: boolean;
  headers?: Record<string, string>;
}

/** Ответ-заглушка, когда бэкенд не сконфигурирован. */
function unavailableResult<T>(): ApiResult<T> {
  return { ok: false, status: -1, data: null, unavailable: true };
}

/**
 * Низкоуровневый запрос. `path` — абсолютный путь от базы (начинается со слэша).
 * Никогда не бросает: сетевые ошибки возвращаются как { ok:false, status:0 }.
 */
export async function http<T = unknown>(
  path: string,
  opts: HttpOptions = {},
): Promise<ApiResult<T>> {
  if (!apiAvailable) return unavailableResult<T>();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(opts.headers || {}),
  };
  if (opts.auth) {
    const tok = accessToken();
    if (tok) headers["Authorization"] = "Bearer " + tok;
  }

  const init: RequestInit = {
    method: opts.method || "POST",
    headers,
  };
  if (opts.body !== undefined) init.body = JSON.stringify(opts.body);

  try {
    const res = await fetch(API_BASE + path, init);
    const txt = await res.text();
    let data: unknown = txt;
    try {
      data = txt ? JSON.parse(txt) : null;
    } catch {
      /* не JSON — оставляем как текст */
    }
    return { ok: res.ok, status: res.status, data: data as T };
  } catch {
    return { ok: false, status: 0, data: null };
  }
}

/** Текст ошибки из ответа (message/error/title), иначе fallback. */
export function errText(r: ApiResult, fallback: string): string {
  const d = r.data as Record<string, unknown> | string | null;
  if (d && typeof d === "object") {
    return (
      (d.message as string) ||
      (d.error as string) ||
      (d.title as string) ||
      fallback
    );
  }
  if (typeof d === "string" && d) return d;
  return fallback;
}
