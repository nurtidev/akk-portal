// =====================================================
// ===== D1: API-клиент — базовая конфигурация =========
// База берётся из NEXT_PUBLIC_API_BASE (Railway variable).
// Пусто → API недоступен: UI работает в demo-fallback и не падает.
// =====================================================

/**
 * Базовый URL Go-бэкенда без хвостового слэша.
 * Эндпоинты auth/credit живут под `<base>/api/v1/...` (см. backend/cmd/server/main.go).
 * Если переменная не задана — клиент считается недоступным (apiAvailable === false),
 * вызовы возвращают признак недоступности, а UI показывает demo-fallback.
 */
const RAW_BASE = (process.env.NEXT_PUBLIC_API_BASE || "").trim();

/** Нормализованная база без хвостового слэша (может быть пустой строкой). */
export const API_BASE = RAW_BASE.replace(/\/+$/, "");

/** true → бэкенд сконфигурирован и к нему можно обращаться. */
export const apiAvailable = API_BASE.length > 0;

/** Префиксы групп маршрутов (контракт main.go). */
export const AUTH_PREFIX = "/api/v1/auth/Account";
export const CREDIT_PREFIX = "/api/v1/credit";

/** Ключ localStorage для токенов — совместим с легаси (__auth-integration.js). */
export const TOKENS_KEY = "akk-tokens";

// =====================================================
// ===== eGov SSO (реальный вход, в т.ч. по ЭЦП) =======
// Заполняется Railway-переменными. Пока не заданы — кнопка eGov работает в демо-режиме.
// redirect_uri ОБЯЗАН точно совпадать с тем, что зарегистрирован в eGov.
// =====================================================

/** URL страницы авторизации eGov (`.../idp/oauth/authorize`). */
export const EGOV_AUTHORIZE_URL = (
  process.env.NEXT_PUBLIC_EGOV_AUTHORIZE_URL || ""
).trim();

/** client_id, выданный eGov для akk-portal. */
export const EGOV_CLIENT_ID = (process.env.NEXT_PUBLIC_EGOV_CLIENT_ID || "").trim();

/** Точный redirect_uri callback'а (как зарегистрирован в eGov). */
export const EGOV_REDIRECT_URI = (
  process.env.NEXT_PUBLIC_EGOV_REDIRECT_URI || ""
).trim();

/** Запрашиваемые области данных (через пробел). Должны быть заведены в админке eGov. */
export const EGOV_SCOPE = (
  process.env.NEXT_PUBLIC_EGOV_SCOPE || "user:basic:read user:phone:read"
).trim();

/** Ключ sessionStorage для anti-CSRF state OAuth-потока. */
export const EGOV_STATE_KEY = "egov-oauth-state";

/** true → реальный eGov-вход сконфигурирован (иначе кнопка падает в демо). */
export const egovSsoEnabled =
  EGOV_AUTHORIZE_URL.length > 0 &&
  EGOV_CLIENT_ID.length > 0 &&
  EGOV_REDIRECT_URI.length > 0;
