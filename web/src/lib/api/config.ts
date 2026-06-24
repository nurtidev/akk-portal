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

// =====================================================
// ===== CREDIT-бэкенд (creditapp) — отдельный хост ====
// AUTH (вход по ИИН+OTP, /me) живёт на akk-backend (API_BASE).
// CREDIT (создание/список заявок) идёт в creditapp credit-backend
// (CREDIT_API_BASE). У creditapp своя БД и свой JWT-секрет: токен akk-backend
// он НЕ примет, поэтому для кредитных вызовов портал бутстрапит ОТДЕЛЬНУЮ
// creditapp-сессию по ИИН заёмщика (см. credit-session.ts).
// Пусто → creditApiAvailable=false → credit-вызовы идут в demo-fallback.
// =====================================================

/** Базовый URL creditapp credit-backend без хвостового слэша.
 * Дефолт — стенд creditapp (внутренний хост, не секрет; доступен на корп. VPN).
 * Railway не всегда пробрасывает NEXT_PUBLIC_ build-arg надёжно, поэтому дефолт
 * гарантирует, что кредитный флоу бьёт в creditapp; env переопределяет при наличии. */
const RAW_CREDIT_BASE = (
  process.env.NEXT_PUBLIC_CREDIT_API_BASE || "https://creditapp-api-dev.agrocredit.kz"
).trim();

/** Нормализованная база creditapp без хвостового слэша. */
export const CREDIT_API_BASE = RAW_CREDIT_BASE.replace(/\/+$/, "");

/** true → creditapp сконфигурирован; иначе credit-вызовы идут в demo-fallback. */
export const creditApiAvailable = CREDIT_API_BASE.length > 0;

/** Ключ localStorage для отдельного creditapp access-токена (мост-сессия). */
export const CREDIT_TOKEN_KEY = "akk-credit-token";

/** Префиксы групп маршрутов (контракт main.go). */
export const AUTH_PREFIX = "/api/v1/auth/Account";
export const CREDIT_PREFIX = "/api/v1/credit";

/** Префикс auth-эндпоинтов creditapp (мост-сессия заёмщика). */
export const CREDIT_AUTH_PREFIX = "/api/v1/auth/Account";

/** Ключ localStorage для токенов — совместим с легаси (__auth-integration.js). */
export const TOKENS_KEY = "akk-tokens";

// =====================================================
// ===== Демо-дефолты для credit-backend (Smart30) =====
// При наличии реальных branch_uid/product_code —
// переопределяйте через NEXT_PUBLIC_ env-переменные.
// =====================================================

/** UUID тестового филиала (дефолт для демо-заявок). */
export const DEMO_BRANCH_UID = (
  process.env.NEXT_PUBLIC_DEMO_BRANCH_UID || "a1000002-0000-0000-0000-000000000002"
).trim();

/** Код продукта Smart30 Agrobusiness (дефолт). */
export const DEMO_PRODUCT_CODE = (
  process.env.NEXT_PUBLIC_DEMO_PRODUCT_CODE || "000000080"
).trim();

/** submit_type для credit-backend (всегда "okaps" при подаче через ОКАПС-фронт). */
export const SUBMIT_TYPE = "okaps" as const;

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
