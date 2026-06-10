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
