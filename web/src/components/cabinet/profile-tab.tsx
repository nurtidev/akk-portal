"use client";

// =====================================================
// ===== D3: вкладка «Профиль» =========================
// Обложка с инициалами + базовый профиль пользователя (имя/ИИН/телефон).
// «Данные из госбаз» — демо-плашка (в проде заполняется через ШЭП).
// =====================================================

import { useTranslations } from "next-intl";
import { formatPhone, initials, onlyDigits } from "@/lib/api";
import type { UserProfile } from "@/lib/api";

export function ProfileTab({ user }: { user: UserProfile }) {
  const t = useTranslations("cabinet");

  return (
    <div>
      {/* Обложка */}
      <div className="relative mb-5 overflow-hidden rounded-[var(--radius-lg)] bg-gradient-to-br from-[#07663D] to-[#054E2E] px-6 py-6">
        <div className="ornament-tile pointer-events-none absolute inset-0 opacity-10" aria-hidden="true" />
        <div className="relative flex items-center gap-4">
          <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full border-2 border-white/50 bg-white/15 text-2xl font-bold text-white">
            {initials(user.name)}
          </div>
          <div className="min-w-0">
            <h2 className="font-display text-xl font-bold leading-tight text-white">
              {user.name || t("nav.profile")}
            </h2>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/35 bg-white/15 px-2.5 py-1 text-[11px] font-bold text-white">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
                {t("profile.verified")}
              </span>
              {user.phone && (
                <span className="text-[12.5px] text-white/90">
                  {formatPhone(onlyDigits(user.phone))}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Базовые данные */}
      <SectionTitle>{t("profile.govTitle")}</SectionTitle>
      <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-4">
        <Row label={t("profile.fio")} value={user.name || "—"} />
        <Row label={t("profile.iin")} value={user.iin || "—"} />
        <Row
          label={t("profile.phone")}
          value={user.phone ? formatPhone(onlyDigits(user.phone)) : "—"}
        />
        <p className="mt-3 text-[11px] leading-relaxed text-[var(--text-3)]">
          {t("profile.govNote")}
        </p>
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-2 mt-1 text-[11px] font-bold uppercase tracking-wider text-[var(--text-3)]">
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 border-b border-[var(--border-soft)] py-2 text-[13px] last:border-b-0">
      <span className="text-[var(--text-3)]">{label}</span>
      <span className="text-right font-semibold text-[var(--text)]">{value}</span>
    </div>
  );
}
