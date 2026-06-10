"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

const LOCALES = [
  { code: "ru", label: "Рус" },
  { code: "kk", label: "Қаз" },
  { code: "en", label: "Eng" },
] as const;

type Locale = (typeof LOCALES)[number]["code"];

/**
 * LangSwitcher — выпадающий переключатель языка.
 * Меняет локаль-префикс в текущем pathname, сохраняя остаток пути.
 */
export function LangSwitcher() {
  const t = useTranslations("header");
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Определяем текущую локаль из pathname
  const currentLocale = (pathname.split("/")[1] as Locale) || "ru";

  // Строим путь для переключения локали
  const pathWithoutLocale = pathname.replace(/^\/(ru|kk|en)/, "") || "/";

  // Закрываем по клику вне
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const currentLabel = LOCALES.find((l) => l.code === currentLocale)?.label ?? "Рус";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 rounded-[var(--radius-sm)] px-2.5 py-1.5 text-xs font-semibold text-[var(--text-2)] hover:text-[var(--primary)] hover:bg-[var(--primary-soft)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
        aria-label={t("toggleLang")}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        {currentLabel}
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          aria-hidden="true"
          className={`transition-transform duration-150 ${open ? "rotate-180" : ""}`}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-1 z-50 min-w-[6rem] rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow)] overflow-hidden"
          role="listbox"
          aria-label={t("toggleLang")}
        >
          {LOCALES.map((locale) => (
            <Link
              key={locale.code}
              href={`/${locale.code}${pathWithoutLocale}`}
              role="option"
              aria-selected={locale.code === currentLocale}
              onClick={() => setOpen(false)}
              className={`flex items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-[var(--primary-soft)] hover:text-[var(--primary)] focus-visible:outline-none focus-visible:bg-[var(--primary-soft)] ${
                locale.code === currentLocale
                  ? "font-semibold text-[var(--primary)]"
                  : "text-[var(--text-2)]"
              }`}
            >
              {locale.label}
              {locale.code === currentLocale && (
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  aria-hidden="true"
                >
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
