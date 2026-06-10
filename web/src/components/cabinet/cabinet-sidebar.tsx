"use client";

// =====================================================
// ===== D3: боковое меню кабинета =====================
// Десктоп — вертикальное sticky-меню; мобайл — горизонтальные вкладки сверху.
// Пункты: Профиль / Мои заявки / Документы / Уведомления / Поддержка / Выйти.
// =====================================================

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { CABINET_TABS, type CabinetTab } from "./tabs";

interface CabinetSidebarProps {
  active: CabinetTab;
  onSelect: (tab: CabinetTab) => void;
  onHome: () => void;
  onLogout: () => void;
  /** Число непрочитанных уведомлений (бейдж). */
  unread?: number;
}

export function CabinetSidebar({
  active,
  onSelect,
  onHome,
  onLogout,
  unread = 0,
}: CabinetSidebarProps) {
  const t = useTranslations("cabinet");
  const activeRef = useRef<HTMLButtonElement | null>(null);

  // Мобайл: активная вкладка всегда в зоне видимости горизонтального скролла.
  useEffect(() => {
    activeRef.current?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [active]);

  return (
    // relative-обёртка нужна только мобильному фейду; на десктопе display:contents,
    // чтобы aside остался прямым ребёнком грида (sticky работает как раньше).
    <div className="relative md:contents">
      {/* Фейд у правого края — подсказка, что вкладки скроллятся */}
      <div
        className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-[var(--bg)] to-transparent md:hidden"
        aria-hidden="true"
      />
    <aside className="flex flex-row gap-1.5 overflow-x-auto pb-1 snap-x [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:sticky md:top-20 md:flex-col md:gap-1 md:overflow-visible md:pb-0 md:self-start">
      {/* «На главную» — скрыта на мобильном */}
      <button
        type="button"
        onClick={onHome}
        className="hidden items-center gap-2.5 rounded-[var(--radius)] px-3 py-2.5 text-left text-sm font-medium text-[var(--text-2)] hover:bg-[var(--bg-tint)] hover:text-[var(--text)] md:flex"
      >
        <HomeIcon />
        <span>{t("nav.home")}</span>
      </button>
      <div className="hidden h-px bg-[var(--border-soft)] md:my-1.5 md:block" />

      {CABINET_TABS.map((tab) => {
        const on = tab.id === active;
        return (
          <button
            key={tab.id}
            ref={on ? activeRef : undefined}
            type="button"
            onClick={() => onSelect(tab.id)}
            aria-current={on ? "page" : undefined}
            className={`flex flex-shrink-0 snap-start items-center gap-2.5 whitespace-nowrap rounded-[var(--radius)] px-4 py-2.5 text-left text-sm font-medium transition-colors md:px-3 ${
              on
                ? "bg-[var(--primary-soft)] text-[var(--primary)] font-semibold"
                : "text-[var(--text-2)] hover:bg-[var(--bg-tint)] hover:text-[var(--text)]"
            }`}
          >
            <NavIcon id={tab.id} />
            <span>{t(tab.labelKey)}</span>
            {tab.id === "notif" && unread > 0 && (
              <span className="ml-auto inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#e8413c] px-1.5 text-[10px] font-bold text-white">
                {unread}
              </span>
            )}
          </button>
        );
      })}

      <div className="hidden h-px bg-[var(--border-soft)] md:my-1.5 md:block" />
      <button
        type="button"
        onClick={onLogout}
        className="hidden items-center gap-2.5 rounded-[var(--radius)] px-3 py-2.5 text-left text-sm font-medium text-[var(--danger)] hover:bg-[var(--bg-tint)] md:flex"
      >
        <LogoutIcon />
        <span>{t("nav.logout")}</span>
      </button>
    </aside>
    </div>
  );
}

const iconProps = {
  width: 18,
  height: 18,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
  className: "flex-shrink-0",
};

function NavIcon({ id }: { id: CabinetTab }) {
  switch (id) {
    case "profile":
      return (
        <svg {...iconProps}>
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" />
        </svg>
      );
    case "apps":
      return (
        <svg {...iconProps}>
          <path d="M9 11l3 3 8-8" />
          <path d="M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9" />
        </svg>
      );
    case "docs":
      return (
        <svg {...iconProps}>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <path d="M14 2v6h6" />
        </svg>
      );
    case "notif":
      return (
        <svg {...iconProps}>
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.7 21a2 2 0 0 1-3.4 0" />
        </svg>
      );
    case "support":
      return (
        <svg {...iconProps}>
          <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
          <path d="M21 19a2 2 0 0 1-2 2h-3v-7h3a2 2 0 0 1 2 2zM3 19a2 2 0 0 0 2 2h3v-7H5a2 2 0 0 0-2 2z" />
        </svg>
      );
    default:
      return null;
  }
}

function HomeIcon() {
  return (
    <svg {...iconProps}>
      <path d="M3 11l9-8 9 8" />
      <path d="M5 10v10h14V10" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg {...iconProps}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  );
}
