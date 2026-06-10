"use client";

// =====================================================
// ===== D2: AuthProvider — контекст авторизации =======
// user / tokens / login / logout / openAuth / восстановление сессии.
// Восстановление: токен из localStorage → профиль из JWT, затем уточнение через me().
// =====================================================

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  accessToken,
  clearTokens,
  loadTokens,
  profileFromTokens,
  saveTokens,
  type Tokens,
  type UserProfile,
} from "@/lib/api";
import { me } from "@/lib/api";

/** Какой экран модалки авторизации открыт. */
export type AuthView = "login" | "register" | null;

interface AuthContextValue {
  /** Текущий пользователь (null — гость). */
  user: UserProfile | null;
  /** Идёт ли восстановление сессии (первичная загрузка). */
  ready: boolean;
  /** Открытый экран модалки (login/register) или null. */
  authView: AuthView;
  /** Открыть модалку авторизации на нужном экране. */
  openAuth: (view?: AuthView) => void;
  /** Закрыть модалку. */
  closeAuth: () => void;
  /** Завершить вход: сохранить токены + профиль, закрыть модалку, выполнить отложенное. */
  completeLogin: (tokens: Tokens, profile: UserProfile) => void;
  /** Выйти: очистить токены и профиль. */
  logout: () => void;
  /**
   * Зарегистрировать «отложенное действие» (например, подачу заявки),
   * которое выполнится автоматически сразу после успешного входа.
   */
  setPendingAction: (fn: (() => void) | null) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [ready, setReady] = useState(false);
  const [authView, setAuthView] = useState<AuthView>(null);
  const pendingRef = useRef<(() => void) | null>(null);

  // Восстановление сессии при монтировании.
  useEffect(() => {
    let cancelled = false;
    const tok = accessToken();
    if (!tok) {
      setReady(true);
      return;
    }
    // Мгновенно поднимаем профиль из JWT, чтобы UI не моргал.
    const fromJwt = profileFromTokens(loadTokens(), "");
    if (fromJwt.iin || fromJwt.name) setUser(fromJwt);

    // Уточняем у бэкенда (и заодно проверяем валидность токена).
    me()
      .then((r) => {
        if (cancelled) return;
        if (r.unavailable) return; // demo без бэка — оставляем профиль из JWT
        if (r.ok && r.data && (r.data.iin || r.data.name)) {
          setUser({
            name: r.data.name || fromJwt.name || "",
            iin: r.data.iin || fromJwt.iin || "",
            phone: r.data.phone || fromJwt.phone || "",
          });
        } else if (r.status === 401) {
          // Токен протух — выходим.
          clearTokens();
          setUser(null);
        }
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const openAuth = useCallback((view: AuthView = "login") => {
    setAuthView(view || "login");
  }, []);

  const closeAuth = useCallback(() => setAuthView(null), []);

  const completeLogin = useCallback(
    (tokens: Tokens, profile: UserProfile) => {
      saveTokens(tokens);
      setUser(profile);
      setAuthView(null);
      // Выполняем отложенное действие (например, подачу заявки).
      const fn = pendingRef.current;
      pendingRef.current = null;
      if (fn) setTimeout(fn, 50);
    },
    [],
  );

  const logout = useCallback(() => {
    clearTokens();
    setUser(null);
    pendingRef.current = null;
  }, []);

  const setPendingAction = useCallback((fn: (() => void) | null) => {
    pendingRef.current = fn;
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      ready,
      authView,
      openAuth,
      closeAuth,
      completeLogin,
      logout,
      setPendingAction,
    }),
    [user, ready, authView, openAuth, closeAuth, completeLogin, logout, setPendingAction],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** Хук доступа к контексту авторизации. */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth должен использоваться внутри <AuthProvider>");
  }
  return ctx;
}
