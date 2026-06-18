"use client";

// =====================================================
// ===== D3: вкладка «Профиль» =========================
// Обложка с инициалами/фото + базовый профиль (имя/ИИН/телефон).
// ИИН маскируется (видны первые 4 и последние 2 цифры). Фото и номер
// можно изменить — в прототипе правки хранятся локально (localStorage,
// ключи по ИИН); в проде это уйдёт на бэкенд (фото) и подтверждение по SMS
// (смена номера). «Данные из госбаз» — демо-плашка (в проде через ШЭП).
// =====================================================

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { formatPhone, initials, maskIin, onlyDigits } from "@/lib/api";
import type { UserProfile } from "@/lib/api";

const avatarKey = (iin: string) => `akk_avatar_${onlyDigits(iin) || "anon"}`;
const phoneKey = (iin: string) => `akk_phone_${onlyDigits(iin) || "anon"}`;

export function ProfileTab({ user }: { user: UserProfile }) {
  const t = useTranslations("cabinet");

  // Локальные правки прототипа (фото + переопределение номера).
  const [avatar, setAvatar] = useState<string | null>(null);
  const [phoneOverride, setPhoneOverride] = useState<string | null>(null);
  const [editingPhone, setEditingPhone] = useState(false);
  const [phoneDraft, setPhoneDraft] = useState("");
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      setAvatar(localStorage.getItem(avatarKey(user.iin)) || null);
      setPhoneOverride(localStorage.getItem(phoneKey(user.iin)) || null);
    } catch {
      /* приватный режим / квота — игнорируем */
    }
  }, [user.iin]);

  const effectivePhone = phoneOverride || user.phone;

  function onPickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // позволяем выбрать тот же файл повторно
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const data = String(reader.result || "");
      setAvatar(data);
      try {
        localStorage.setItem(avatarKey(user.iin), data);
      } catch {
        /* квота — фото остаётся только в памяти */
      }
    };
    reader.readAsDataURL(file);
  }

  function startEditPhone() {
    setPhoneDraft(formatPhone(onlyDigits(effectivePhone)));
    setEditingPhone(true);
  }

  function savePhone() {
    const digits = onlyDigits(phoneDraft);
    setPhoneOverride(digits);
    try {
      localStorage.setItem(phoneKey(user.iin), digits);
    } catch {
      /* квота — номер остаётся только в памяти */
    }
    setEditingPhone(false);
  }

  return (
    <div>
      {/* Обложка */}
      <div className="relative mb-5 overflow-hidden rounded-[var(--radius-lg)] bg-gradient-to-br from-[#07663D] to-[#054E2E] px-6 py-6">
        <div className="ornament-tile pointer-events-none absolute inset-0 opacity-10" aria-hidden="true" />
        <div className="relative flex items-center gap-4">
          {/* Аватар + кнопка смены фото */}
          <div className="relative h-16 w-16 flex-shrink-0">
            {avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatar}
                alt=""
                className="h-16 w-16 rounded-full border-2 border-white/50 object-cover"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-white/50 bg-white/15 text-2xl font-bold text-white">
                {initials(user.name)}
              </div>
            )}
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              title={t("profile.changePhoto")}
              aria-label={t("profile.changePhoto")}
              className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border border-[var(--border)] bg-white text-[var(--primary)] shadow-sm transition hover:bg-[var(--surface-2,#f3efe3)]"
            >
              <PencilIcon />
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onPickPhoto}
            />
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
              {effectivePhone && (
                <span className="text-[12.5px] text-white/90">
                  {formatPhone(onlyDigits(effectivePhone))}
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
        <Row label={t("profile.iin")} value={user.iin ? maskIin(user.iin) : "—"} />

        {/* Телефон — с возможностью изменить */}
        {editingPhone ? (
          <div className="border-b border-[var(--border-soft)] py-2.5">
            <div className="mb-1.5 text-[11px] font-semibold text-[var(--text-3)]">
              {t("profile.phoneEditTitle")}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="tel"
                inputMode="tel"
                autoFocus
                value={phoneDraft}
                onChange={(e) => setPhoneDraft(formatPhone(e.target.value))}
                placeholder="+7 (___) ___-__-__"
                className="h-9 min-w-0 flex-1 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg)] px-3 text-[13px] text-[var(--text)] outline-none focus:border-[var(--primary)]"
              />
              <button
                type="button"
                onClick={savePhone}
                className="inline-flex h-9 items-center justify-center rounded-[var(--radius)] bg-[var(--primary)] px-4 text-[13px] font-semibold text-white transition hover:bg-[var(--primary-2)]"
              >
                {t("profile.save")}
              </button>
              <button
                type="button"
                onClick={() => setEditingPhone(false)}
                className="inline-flex h-9 items-center justify-center rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-4 text-[13px] font-semibold text-[var(--text-2)] transition hover:border-[var(--primary)]"
              >
                {t("profile.cancel")}
              </button>
            </div>
            <p className="mt-1.5 text-[11px] text-[var(--text-3)]">{t("profile.phoneHint")}</p>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3 border-b border-[var(--border-soft)] py-2 text-[13px] last:border-b-0">
            <span className="text-[var(--text-3)]">{t("profile.phone")}</span>
            <span className="flex items-center gap-2">
              <span className="text-right font-semibold text-[var(--text)]">
                {effectivePhone ? formatPhone(onlyDigits(effectivePhone)) : "—"}
              </span>
              <button
                type="button"
                onClick={startEditPhone}
                title={t("profile.editPhone")}
                aria-label={t("profile.editPhone")}
                className="flex h-7 w-7 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--bg)] text-[var(--text-3)] transition hover:border-[var(--primary)] hover:text-[var(--primary)]"
              >
                <PencilIcon />
              </button>
            </span>
          </div>
        )}

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

function PencilIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}
