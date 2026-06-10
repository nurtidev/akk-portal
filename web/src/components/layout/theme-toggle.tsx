"use client";

import { useTranslations } from "next-intl";
import { useTheme } from "@/hooks/use-theme";

/**
 * ThemeToggle — кнопка переключения светлой/тёмной темы.
 * Сохраняет в localStorage под ключом `akk-theme` (совместимость с легаси).
 */
export function ThemeToggle() {
  const t = useTranslations("header");
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="inline-flex items-center justify-center rounded-[var(--radius-sm)] p-2 text-[var(--text-2)] hover:text-[var(--primary)] hover:bg-[var(--primary-soft)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
      aria-label={t("toggleTheme")}
      title={t("toggleTheme")}
    >
      {theme === "dark" ? (
        /* Солнце — переключить на светлую */
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="5" />
          <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
        </svg>
      ) : (
        /* Луна — переключить на тёмную */
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      )}
    </button>
  );
}
