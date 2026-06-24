"use client";

// =====================================================
// ===== D5: SSO demo (eGov / Baiterek) ================
// Демо-вход: бэкенд создаёт демо-клиента и выдаёт токены (ssoDemoLogin),
// после чего кабинет/подача заявки работают как при обычном входе.
// Логотипы — /img/egov.png и /img/baiterek.png (скопированы из img/programs/).
// При отсутствии файла показываем текстовый бейдж (onError-фолбэк).
// =====================================================

import { useState } from "react";
import Image from "next/image";
import { useTranslations, useLocale } from "next-intl";
import { errText, ssoDemoLogin, startEgovLogin, egovSsoEnabled } from "@/lib/api";
import { useAuth } from "./auth-provider";

interface SsoButtonsProps {
  /** Необязательный колбэк после успешного входа (provider сам делает completeLogin). */
  onAuthorized?: (
    tokens: { accessToken?: string; refreshToken?: string },
    profile: { name: string; iin: string; phone: string },
  ) => void;
}

const PROVIDERS: {
  id: "egov" | "baiterek";
  logo: string;
  labelKey: string;
}[] = [
  { id: "egov", logo: "/img/egov.png", labelKey: "auth.ssoEgov" },
  // Baiterek временно убран — оставляем только вход через eGov.
];

export function SsoButtons({ onAuthorized }: SsoButtonsProps) {
  const t = useTranslations("cabinet");
  const locale = useLocale() as "ru" | "kk" | "en";
  const { completeLogin } = useAuth();
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState("");
  const [imgFailed, setImgFailed] = useState<Record<string, boolean>>({});

  async function login(provider: "egov" | "baiterek") {
    setErr("");
    // Реальный eGov-вход (если сконфигурирован): уводим браузер на idp.egov.kz —
    // там пользователь входит, в т.ч. по ЭЦП. Возврат обработает /auth/egov/callback.
    if (provider === "egov" && egovSsoEnabled) {
      setBusy(provider);
      if (startEgovLogin(locale)) return; // редирект уже идёт
      setBusy(null);
    }
    setBusy(provider);
    const r = await ssoDemoLogin(provider);
    setBusy(null);
    if (r.unavailable) {
      setErr(t("auth.errUnavailable"));
      return;
    }
    if (!r.ok || !r.data) {
      setErr(errText(r, t("auth.errSso")));
      return;
    }
    const tokens = {
      accessToken: r.data.accessToken,
      refreshToken: r.data.refreshToken,
    };
    const profile = {
      name: r.data.name || "",
      iin: r.data.iin || "",
      phone: r.data.phone || "",
    };
    completeLogin(tokens, profile);
    onAuthorized?.(tokens, profile);
  }

  return (
    <div>
      <div className="grid grid-cols-1 gap-3">
        {PROVIDERS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => login(p.id)}
            disabled={busy !== null}
            className="flex items-center justify-center gap-2 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm font-medium text-[var(--text-2)] transition-colors hover:border-[var(--primary)] hover:text-[var(--text)] disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
          >
            {busy === p.id ? (
              <span className="text-xs text-[var(--text-3)]">
                {t("auth.signingIn")}
              </span>
            ) : (
              <>
                {!imgFailed[p.id] ? (
                  <Image
                    src={p.logo}
                    alt=""
                    width={20}
                    height={20}
                    className="h-5 w-5 object-contain"
                    onError={() =>
                      setImgFailed((m) => ({ ...m, [p.id]: true }))
                    }
                  />
                ) : null}
                <span>{t(p.labelKey)}</span>
              </>
            )}
          </button>
        ))}
      </div>
      {err && <p className="mt-2 text-sm text-[var(--danger)]">{err}</p>}
    </div>
  );
}
