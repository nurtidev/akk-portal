"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { AkkMark } from "@/components/icons/akk-mark";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { LangSwitcher } from "@/components/layout/lang-switcher";
import { AuthSlot } from "@/components/auth/auth-slot";

/**
 * SiteHeader — шапка сайта по образцу index.html:2167–2204.
 * - Логотип АКК (эмблема + полное название + аббревиатура на 360px)
 * - Навигация: Программы / Подбор / Контакты
 * - Действия: тоггл темы, переключатель языка, CTA 1408, слот «Войти»
 * - Бургер-меню ≤640px
 * - Адаптив до 360px (аббревиатура вместо полного названия)
 */
export function SiteHeader() {
  const t = useTranslations("header");
  const nav = useTranslations("nav");
  const pathname = usePathname();

  // Извлекаем локаль из pathname (/ru/..., /kk/..., /en/...)
  const locale = pathname.split("/")[1] || "ru";

  const [mobileOpen, setMobileOpen] = useState(false);

  const navLinks = [
    { href: `/${locale}#programs`, label: nav("programs") },
    { href: `/${locale}#quiz`, label: nav("selection") },
    { href: `/${locale}#contacts`, label: nav("contacts") },
  ];

  return (
    <header
      className="site-header sticky top-0 z-50 w-full border-b border-[var(--border)] bg-[var(--surface)]/90 backdrop-blur-sm transition-colors"
      style={{
        // Тёмная тема: более тёмный фон шапки (как в легаси .dark .site-header)
        // Управляется через CSS-переменные
      }}
    >
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between gap-4">
          {/* Логотип */}
          <Link
            href={`/${locale}`}
            className="logo flex items-center gap-3 min-w-0 flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] rounded"
            aria-label="АКК — на главную"
          >
            <AkkMark
              className="h-9 w-9 flex-shrink-0"
              aria-hidden="true"
            />
            {/* Полное название — скрываем на очень узких экранах */}
            <span className="logo-name hidden sm:flex flex-col leading-tight min-w-0">
              <span className="font-display font-semibold text-[var(--primary)] text-sm leading-tight truncate">
                {t("logoName")}
              </span>
              <span className="text-[var(--text-3)] text-[11px] leading-tight truncate">
                {t("logoSubtitle")}
              </span>
            </span>
            {/* Аббревиатура — только на ≤640px */}
            <span
              className="logo-abbr sm:hidden font-display font-bold text-[var(--primary)] text-lg"
              aria-hidden="true"
            >
              {t("logoAbbr")}
            </span>
          </Link>

          {/* Навигация — скрываем на мобильных */}
          <nav
            className="site-nav hidden md:flex items-center gap-6"
            aria-label="Основная навигация"
          >
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-[var(--text-2)] hover:text-[var(--primary)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] rounded"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Действия справа */}
          <div className="header-actions flex items-center gap-2">
            {/* Переключатель темы */}
            <ThemeToggle />

            {/* Переключатель языка */}
            <LangSwitcher />

            {/* CTA: Колл-центр */}
            <a
              href="tel:1408"
              className="hidden sm:inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] bg-[var(--primary-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--primary)] hover:bg-[var(--primary)] hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
              aria-label="Позвонить в колл-центр: 1408"
            >
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
              {/* Полный текст ≥sm */}
              <span className="hidden sm:inline">{t("callCenter")}</span>
            </a>
            {/* Короткий вариант 1408 на xs */}
            <a
              href="tel:1408"
              className="sm:hidden inline-flex items-center gap-1 rounded-[var(--radius-sm)] bg-[var(--primary-soft)] px-2.5 py-1.5 text-xs font-semibold text-[var(--primary)] hover:bg-[var(--primary)] hover:text-white transition-colors"
              aria-label="1408 — Колл-центр"
            >
              {t("callCenterShort")}
            </a>

            {/* Слот авторизации — вход по SMS / SSO + кабинет (трек D) */}
            <AuthSlot />

            {/* Бургер — только ≤md */}
            <button
              type="button"
              className="md:hidden inline-flex items-center justify-center rounded-[var(--radius-sm)] p-2 text-[var(--text-2)] hover:text-[var(--primary)] hover:bg-[var(--primary-soft)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label={mobileOpen ? nav("close") : nav("menu")}
              aria-expanded={mobileOpen}
              aria-controls="mobile-nav"
            >
              {mobileOpen ? (
                /* Иконка закрыть */
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  aria-hidden="true"
                >
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              ) : (
                /* Иконка бургер */
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  aria-hidden="true"
                >
                  <path d="M3 6h18M3 12h18M3 18h18" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Мобильное меню — раскрывается по бургеру ≤md */}
      <nav
        id="mobile-nav"
        className={`md:hidden border-t border-[var(--border)] bg-[var(--surface)] transition-all duration-200 ${
          mobileOpen ? "block" : "hidden"
        }`}
        aria-label="Мобильная навигация"
      >
        <div className="container mx-auto px-4 py-3 flex flex-col gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="block rounded-[var(--radius-sm)] px-3 py-2.5 text-sm font-medium text-[var(--text-2)] hover:bg-[var(--primary-soft)] hover:text-[var(--primary)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
              onClick={() => setMobileOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          {/* Войти — в мобильном меню */}
          <div className="mt-2 pt-2 border-t border-[var(--border-soft)]">
            <button
              type="button"
              className="w-full text-left rounded-[var(--radius-sm)] px-3 py-2.5 text-sm font-medium text-[var(--text-2)] hover:bg-[var(--primary-soft)] hover:text-[var(--primary)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
            >
              {nav("login")}
            </button>
          </div>
        </div>
      </nav>
    </header>
  );
}
