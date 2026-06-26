// Утилиты для работы с токеном авторизации в localStorage
// SSR-безопасны: все обращения к window проверяются

const TOKEN_KEY = 'akk_admin_token';
const NAME_KEY = 'akk_admin_name';

/** Получить токен из localStorage (или null на сервере) */
export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

/** Получить имя авторизованного пользователя */
export function getName(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(NAME_KEY);
}

/** Сохранить токен и имя после успешного входа */
export function setToken(token: string, name: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(NAME_KEY, name);
}

/** Очистить данные сессии (выход) */
export function clearToken(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(NAME_KEY);
}

/** Проверить авторизацию; если токена нет — вернуть false */
export function isAuthenticated(): boolean {
  return !!getToken();
}
