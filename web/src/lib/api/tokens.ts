// =====================================================
// ===== D1: токены + разбор JWT-клеймов ===============
// Хранилище — localStorage['akk-tokens'] (совместимость с легаси).
// Профиль для UI поднимается из JWT-claims, как в __auth-integration.js.
// =====================================================

import { TOKENS_KEY } from "./config";

/** Пара токенов, как их отдаёт бэкенд (VerifySmsCode/smsRegister/ssoDemoLogin). */
export interface Tokens {
  accessToken?: string;
  refreshToken?: string;
}

/** Профиль пользователя для UI (из JWT-клеймов или ответа SSO). */
export interface UserProfile {
  name: string;
  iin: string;
  phone: string;
}

const isBrowser = typeof window !== "undefined";

/** Сохранить токены в localStorage. */
export function saveTokens(t: Tokens): void {
  if (!isBrowser) return;
  try {
    localStorage.setItem(TOKENS_KEY, JSON.stringify(t || {}));
  } catch {
    /* приватный режим / квота — игнорируем */
  }
}

/** Загрузить токены из localStorage (или пустой объект). */
export function loadTokens(): Tokens {
  if (!isBrowser) return {};
  try {
    return JSON.parse(localStorage.getItem(TOKENS_KEY) || "{}") as Tokens;
  } catch {
    return {};
  }
}

/** Удалить токены (logout). */
export function clearTokens(): void {
  if (!isBrowser) return;
  try {
    localStorage.removeItem(TOKENS_KEY);
  } catch {
    /* игнорируем */
  }
}

/** Текущий access-токен (или пустая строка). */
export function accessToken(): string {
  return loadTokens().accessToken || "";
}

/**
 * Разбор payload JWT (без проверки подписи — только для UI-профиля).
 * Перенос логики decodeURIComponent(escape(atob(...))) из легаси для кириллицы.
 */
export function parseJwt(token: string): Record<string, unknown> {
  try {
    const part = token.split(".")[1];
    const b64 = part.replace(/-/g, "+").replace(/_/g, "/");
    const pad = b64.length % 4 ? "=".repeat(4 - (b64.length % 4)) : "";
    const json = decodeURIComponent(escape(atob(b64 + pad)));
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

/**
 * Профиль из токенов (как profileFromTokens в легаси):
 * name = claims.name || "lastName firstName"; iin/phone из клеймов (fallback — переданный iin).
 */
export function profileFromTokens(tokens: Tokens, fallbackIin = ""): UserProfile {
  const claims = tokens.accessToken ? parseJwt(tokens.accessToken) : {};
  const name =
    str(claims.name) ||
    [str(claims.lastName), str(claims.firstName)].filter(Boolean).join(" ") ||
    "";
  const iin = fallbackIin || str(claims.iin) || "";
  const phone = str(claims.phone) || "";
  return {
    name: name || (fallbackIin ? "ИИН " + fallbackIin : ""),
    iin,
    phone,
  };
}
