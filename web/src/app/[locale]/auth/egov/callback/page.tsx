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
  const ran = useRef(false); // защита от двойного запуска (StrictMode/повторный рендер)

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const state = params.get("state");
    const oauthError =
      params.get("error_description") || params.get("error");

    function fail(msg: string) {
      setPhase("error");
      setMessage(msg);
    }

    if (oauthError) {
      fail("eGov отклонил вход: " + oauthError);
      return;
    }
    if (!code) {
      fail("eGov не вернул код авторизации.");
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
      fail("Не совпал параметр state — возможна подмена запроса. Повторите вход.");
      return;
    }

    // redirect_uri ОБЯЗАН совпадать с тем, что слали в /authorize (eGov сверяет точно).
    ssoEgovLogin(code, EGOV_REDIRECT_URI).then((r) => {
      if (r.unavailable) {
        fail("Сервис временно недоступен. Попробуйте позже.");
        return;
      }
      if (!r.ok || !r.data?.accessToken) {
        fail(errText(r, "Не удалось завершить вход через eGov."));
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
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[var(--bg)] px-6 text-center">
      {phase === "working" ? (
        <>
          <div
            className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--primary)]"
            aria-hidden
          />
          <p className="text-sm text-[var(--text-2)]">{message}</p>
        </>
      ) : (
        <>
          <p className="max-w-sm text-sm text-[var(--danger)]">{message}</p>
          <a
            href={`/${locale}`}
            className="rounded-[var(--radius-sm)] border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--text)] transition-colors hover:border-[var(--primary)]"
          >
            На главную
          </a>
        </>
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
