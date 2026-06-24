"use client";

// =====================================================
// ===== eGov OAuth callback ===========================
// Сюда eGov возвращает пользователя после авторизации (в т.ч. по ЭЦП) с ?code=&state=.
// Страница: сверяет state, меняет code на токены через бэкенд, сохраняет токены и
// уводит в кабинет. AuthProvider кабинета поднимет сессию из localStorage.
// Лежит под [locale], т.к. корневой layout не даёт <html>/<body> — redirect_uri = .../ru/auth/egov/callback.
// =====================================================

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import {
  EGOV_REDIRECT_URI,
  EGOV_STATE_KEY,
  errText,
  saveTokens,
  ssoEgovLogin,
} from "@/lib/api";

type Phase = "working" | "error";

function CallbackInner() {
  const router = useRouter();
  const locale = useLocale();
  const [phase, setPhase] = useState<Phase>("working");
  const [message, setMessage] = useState("Завершаем вход через eGov…");
  const [code, setCode] = useState(""); // короткий код ошибки для пользователя/поддержки
  const ran = useRef(false); // защита от двойного запуска (StrictMode/повторный рендер)

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const state = params.get("state");
    const oauthError =
      params.get("error_description") || params.get("error");

    function fail(msg: string, errCode: string) {
      setPhase("error");
      setMessage(msg);
      setCode(errCode);
    }

    if (oauthError) {
      fail("eGov отклонил вход: " + oauthError, "EGOV_DENIED");
      return;
    }
    if (!code) {
      fail("eGov не вернул код авторизации.", "NO_CODE");
      return;
    }

    // Сверка anti-CSRF state (если был сохранён при старте потока).
    let savedState: string | null = null;
    try {
      savedState = sessionStorage.getItem(EGOV_STATE_KEY);
      sessionStorage.removeItem(EGOV_STATE_KEY);
    } catch {
      /* приватный режим — пропускаем сверку */
    }
    if (savedState && state && savedState !== state) {
      fail("Не совпал параметр state — возможна подмена запроса. Повторите вход.", "STATE_MISMATCH");
      return;
    }

    // redirect_uri ОБЯЗАН совпадать с тем, что слали в /authorize (eGov сверяет точно).
    ssoEgovLogin(code, EGOV_REDIRECT_URI).then((r) => {
      if (r.unavailable) {
        fail("Сервис временно недоступен. Попробуйте позже.", "SERVICE_UNAVAILABLE");
        return;
      }
      if (!r.ok || !r.data?.accessToken) {
        fail(errText(r, "Не удалось завершить вход через eGov."), "EGOV_EXCHANGE_FAILED");
        return;
      }
      saveTokens({
        accessToken: r.data.accessToken,
        refreshToken: r.data.refreshToken,
      });
      // Кабинет поднимет профиль из токена/через me().
      router.replace(`/${locale}/cabinet`);
    });
  }, [router, locale]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[var(--bg)] px-6 py-12 text-center">
      {phase === "working" ? (
        <div className="flex flex-col items-center gap-4">
          <div
            className="h-12 w-12 animate-spin rounded-full border-[3px] border-[var(--border)] border-t-[var(--primary)]"
            aria-hidden
          />
          <p className="text-sm font-medium text-[var(--text-2)]">{message}</p>
          <p className="text-xs uppercase tracking-wide text-[var(--text-3)]">Вход через eGov</p>
        </div>
      ) : (
        <div className="w-full max-w-sm rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-7 shadow-[var(--shadow-lg)]">
          {/* Иконка-предупреждение (SVG, без эмодзи) */}
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--danger-soft,#fdecec)] text-[var(--danger,#d23b3b)]">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7.5v5" />
              <path d="M12 16.5h.01" />
            </svg>
          </div>
          <h1 className="font-display text-xl font-bold text-[var(--text)]">
            Не удалось войти через eGov
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-[var(--text-2)]">{message}</p>
          {code && (
            <p className="mt-3 inline-block rounded-[var(--radius-sm)] bg-[var(--bg-tint,#f4f4f5)] px-2.5 py-1 font-mono text-xs text-[var(--text-3)]">
              Код ошибки: {code}
            </p>
          )}
          <div className="mt-6 flex flex-col gap-2.5">
            <a
              href={`/${locale}`}
              className="w-full rounded-[var(--radius-sm)] bg-[var(--primary)] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[var(--primary-2,#247035)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
            >
              Попробовать снова
            </a>
            <a
              href={`/${locale}`}
              className="w-full rounded-[var(--radius-sm)] border border-[var(--border)] px-4 py-2.5 text-sm font-medium text-[var(--text-2)] transition-colors hover:border-[var(--primary)] hover:text-[var(--text)]"
            >
              На главную
            </a>
          </div>
        </div>
      )}
    </main>
  );
}

export default function EgovCallbackPage() {
  return (
    <Suspense fallback={null}>
      <CallbackInner />
    </Suspense>
  );
}
