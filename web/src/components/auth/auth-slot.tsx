"use client";

// =====================================================
// ===== D2/D3: слот авторизации в шапке ================
// Гость → кнопка «Войти» (открывает модалку).
// Пользователь → чип с инициалами + дропдаун (Профиль/Заявки/Документы/…/Выйти).
// Заменяет кнопку-заглушку в site-header.tsx.
// =====================================================

import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { initials, firstWord } from "@/lib/api";
import { AuthProvider, useAuth } from "./auth-provider";
import { AuthModal } from "./auth-modal";
import { CABINET_TABS, type CabinetTab } from "../cabinet/tabs";

/**
 * AuthSlot — точка входа авторизации в шапке.
 * Оборачивает себя в AuthProvider, чтобы не зависеть от правок layout (зона трека F):
 * источник истины — localStorage['akk-tokens'], поэтому несколько провайдеров на разных
 * маршрутах остаются согласованными (каждый поднимает сессию из стораджа при монтировании).
 */
export function AuthSlot() {
  return (
    <AuthProvider>
      <AuthSlotInner />
    </AuthProvider>
  );
}

function AuthSlotInner() {
  const t = useTranslations("cabinet");
  const nav = useTranslations("nav");
  const { user, openAuth, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const locale = pathname.split("/")[1] || "ru";
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function go(tab: CabinetTab) {
    setOpen(false);
    router.push(`/${locale}/cabinet?tab=${tab}`);
  }

  if (!user) {
    return (
      <>
        <button
          type="button"
          onClick={() => openAuth("login")}
          className="hidden sm:inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--text-2)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
        >
          {nav("login")}
        </button>
        <AuthModal />
      </>
    );
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] py-1 pl-1 pr-2.5 text-sm transition-colors hover:border-[var(--primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
      >
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[var(--primary-soft)] text-xs font-bold text-[var(--primary)]">
          {initials(user.name)}
        </span>
        <span className="hidden max-w-[120px] truncate font-medium text-[var(--text)] sm:inline">
          {firstWord(user.name) || t("nav.profile")}
        </span>
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          aria-hidden="true"
          className={`text-[var(--text-3)] transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+8px)] z-[1300] min-w-[220px] rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-1.5 shadow-[var(--shadow-lg)]"
        >
          {CABINET_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="menuitem"
              onClick={() => go(tab.id)}
              className="flex w-full items-center gap-2.5 rounded-[var(--radius-sm)] px-2.5 py-2 text-left text-sm text-[var(--text)] hover:bg-[var(--bg-tint)]"
            >
              <TabIcon id={tab.id} />
              <span>{t(tab.labelKey)}</span>
            </button>
          ))}
          <div className="my-1.5 h-px bg-[var(--border-soft)]" />
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              logout();
              router.push(`/${locale}`);
            }}
            className="flex w-full items-center gap-2.5 rounded-[var(--radius-sm)] px-2.5 py-2 text-left text-sm text-[var(--danger)] hover:bg-[var(--bg-tint)]"
          >
            <LogoutIcon />
            <span>{t("nav.logout")}</span>
          </button>
        </div>
      )}
    </div>
  );
}

// --- иконки пунктов меню --------------------------------------------------

function TabIcon({ id }: { id: CabinetTab }) {
  const common = {
    width: 17,
    height: 17,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    className: "flex-shrink-0 text-[var(--text-3)]",
  };
  switch (id) {
    case "profile":
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" />
        </svg>
      );
    case "apps":
      return (
        <svg {...common}>
          <path d="M9 11l3 3 8-8" />
          <path d="M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9" />
        </svg>
      );
    case "docs":
      return (
        <svg {...common}>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <path d="M14 2v6h6" />
        </svg>
      );
    case "notif":
      return (
        <svg {...common}>
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.7 21a2 2 0 0 1-3.4 0" />
        </svg>
      );
    case "support":
      return (
        <svg {...common}>
          <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
          <path d="M21 19a2 2 0 0 1-2 2h-3v-7h3a2 2 0 0 1 2 2zM3 19a2 2 0 0 0 2 2h3v-7H5a2 2 0 0 0-2 2z" />
        </svg>
      );
    default:
      return null;
  }
}

function LogoutIcon() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="flex-shrink-0"
    >
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  );
}
