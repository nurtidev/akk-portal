"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { AkkMark } from "@/components/icons/akk-mark";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { LangSwitcher } from "@/components/layout/lang-switcher";
import { AuthSlot, MobileAuthSlot } from "@/components/auth/auth-slot";

/** Пункты выпадающих меню (slug → ключ перевода в nav.corpItems / nav.clientsItems). */
const CORP_ITEMS = [
  { slug: "about", key: "about" },
  { slug: "sustainability", key: "sustainability" },
  { slug: "investors", key: "investors" },
  { slug: "reporting", key: "reporting" },
  { slug: "procurement", key: "procurement" },
  { slug: "careers", key: "careers" },
  // Пресс-центр переехал на верхний уровень навигации (волна 3)
  { slug: "constitution", key: "constitution" },
] as const;

const CLIENTS_ITEMS = [
  { slug: "how-to-get", key: "howToGet" },
  { slug: "problem-debt", key: "problemDebt" },
  { slug: "investment-projects", key: "investmentProjects" },
  { slug: "insurance", key: "insurance" },
  { slug: "collateral", key: "collateral" },
  { slug: "faq", key: "faq" },
  { slug: "blog", key: "blog" },
] as const;

/** Выпадающее меню навигации (паттерн как в LangSwitcher: клик + закрытие по клику вне). */
function NavDropdown({
  label,
  items,
  locale,
}: {
  label: string;
  items: ReadonlyArray<{ slug: string; label: string }>;
  locale: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex items-center gap-1 whitespace-nowrap text-sm font-medium text-[var(--text-2)] hover:text-[var(--primary)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] rounded"
      >
        {label}
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          aria-hidden="true"
          className={`transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div
          role="menu"
          className="absolute left-0 top-full mt-2 min-w-[230px] rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] py-1.5 shadow-[var(--shadow-lg)] z-50"
        >
          {items.map((item) => (
            <Link
              key={item.slug}
              role="menuitem"
              href={`/${locale}/${item.slug}`}
              onClick={() => setOpen(false)}
              className="block px-3.5 py-2 text-sm text-[var(--text-2)] hover:bg-[var(--primary-soft)] hover:text-[var(--primary)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
            >
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

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

  const corpItems = CORP_ITEMS.map((i) => ({ slug: i.slug, label: nav(`corpItems.${i.key}`) }));
  const clientsItems = CLIENTS_ITEMS.map((i) => ({ slug: i.slug, label: nav(`clientsItems.${i.key}`) }));

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
            onClick={() => {
              // Уже на главной локали (/ru, /kk, /en): роут не меняется и Next
              // не перемонтирует страницу, поэтому экран воронки сам не сбросится.
              // Шлём событие — <Funnel/> вернётся на лендинг. На других страницах
              // событие безвредно: слушателя нет, Link навигирует на главную как обычно.
              if (pathname === `/${locale}`) {
                window.dispatchEvent(new Event('akk:go-home'));
              }
            }}
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

          {/* Навигация — полный десктоп-режим с xl (≥1280); ниже — бургер.
              5 разделов + логотип + действия + профиль не помещаются в одну
              строку на ≤lg при залогиненном профиле (пункты переносились на
              2 строки). whitespace-nowrap страхует каждый пункт от переноса. */}
          <nav
            className="site-nav hidden xl:flex items-center gap-5"
            aria-label="Основная навигация"
          >
            <NavDropdown label={nav("corp")} items={corpItems} locale={locale} />
            <NavDropdown label={nav("clients")} items={clientsItems} locale={locale} />
            {/* Продукты — между «Клиентам» и «Партнёрам», стиль как у остальных пунктов */}
            <Link
              href={`/${locale}/products`}
              className="whitespace-nowrap text-sm font-medium text-[var(--text-2)] hover:text-[var(--primary)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] rounded"
            >
              {nav("products")}
            </Link>
            {/* Калькулятор — публичный pre-screen, отдельной страницей (фидбэк дизайнера) */}
            <Link
              href={`/${locale}/calculator`}
              className="whitespace-nowrap text-sm font-medium text-[var(--text-2)] hover:text-[var(--primary)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] rounded"
            >
              {nav("calculator")}
            </Link>
            <Link
              href={`/${locale}/partners`}
              className="whitespace-nowrap text-sm font-medium text-[var(--text-2)] hover:text-[var(--primary)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] rounded"
            >
              {nav("partners")}
            </Link>
            {/* Пресс-центр — верхний уровень (был в выпадашке «О корпорации», волна 3) */}
            <Link
              href={`/${locale}/press`}
              className="whitespace-nowrap text-sm font-medium text-[var(--text-2)] hover:text-[var(--primary)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] rounded"
            >
              {nav("press")}
            </Link>
            <Link
              href={`/${locale}/contacts`}
              className="whitespace-nowrap text-sm font-medium text-[var(--text-2)] hover:text-[var(--primary)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] rounded"
            >
              {nav("contacts")}
            </Link>
          </nav>

          {/* Действия справа */}
          <div className="header-actions flex items-center gap-2">
            {/* Тема и язык — вне полного десктоп-режима переезжают в бургер
                (иначе шапка перегружена при залогиненном профиле). */}
            <span className="hidden xl:inline-flex">
              <ThemeToggle />
            </span>
            <span className="hidden xl:inline-flex">
              <LangSwitcher />
            </span>

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
              {/* Полный текст «1408 · Колл-центр» — только на широких экранах (≥2xl),
                  чтобы при полном десктоп-меню (xl) шапка не переполнялась. */}
              <span className="hidden 2xl:inline">{t("callCenter")}</span>
              {/* На xl показываем короткое «1408» рядом с иконкой. */}
              <span className="hidden xl:inline 2xl:hidden">{t("callCenterShort")}</span>
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

            {/* Бургер — пока не включён полный десктоп-режим (<xl) */}
            <button
              type="button"
              className="xl:hidden inline-flex items-center justify-center rounded-[var(--radius-sm)] p-2 text-[var(--text-2)] hover:text-[var(--primary)] hover:bg-[var(--primary-soft)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
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

      {/* Мобильное меню — раскрывается по бургеру (<xl) */}
      <nav
        id="mobile-nav"
        className={`xl:hidden border-t border-[var(--border)] bg-[var(--surface)] transition-all duration-200 ${
          mobileOpen ? "block" : "hidden"
        }`}
        aria-label="Мобильная навигация"
      >
        <div className="container mx-auto px-4 py-3 flex flex-col gap-1 max-h-[75vh] overflow-y-auto">
          {/* Группы разделов: «О корпорации» и «Клиентам» */}
          {(
            [
              { title: nav("corp"), items: corpItems },
              { title: nav("clients"), items: clientsItems },
            ] as const
          ).map((group) => (
            <div key={group.title} className="mt-1 pt-2 border-t border-[var(--border-soft)]">
              <div className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-3)]">
                {group.title}
              </div>
              {group.items.map((item) => (
                <Link
                  key={item.slug}
                  href={`/${locale}/${item.slug}`}
                  className="block rounded-[var(--radius-sm)] px-3 py-2 text-sm text-[var(--text-2)] hover:bg-[var(--primary-soft)] hover:text-[var(--primary)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
                  onClick={() => setMobileOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          ))}

          {/* Продукты — между «Клиентам» и «Партнёрам» (зеркало десктопа) */}
          <Link
            href={`/${locale}/products`}
            className="mt-1 pt-2 border-t border-[var(--border-soft)] block rounded-[var(--radius-sm)] px-3 py-2.5 text-sm font-medium text-[var(--text-2)] hover:bg-[var(--primary-soft)] hover:text-[var(--primary)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
            onClick={() => setMobileOpen(false)}
          >
            {nav("products")}
          </Link>

          {/* Калькулятор — публичный pre-screen, отдельной страницей (зеркало десктопа) */}
          <Link
            href={`/${locale}/calculator`}
            className="block rounded-[var(--radius-sm)] px-3 py-2.5 text-sm font-medium text-[var(--text-2)] hover:bg-[var(--primary-soft)] hover:text-[var(--primary)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
            onClick={() => setMobileOpen(false)}
          >
            {nav("calculator")}
          </Link>

          <Link
            href={`/${locale}/partners`}
            className="block rounded-[var(--radius-sm)] px-3 py-2.5 text-sm font-medium text-[var(--text-2)] hover:bg-[var(--primary-soft)] hover:text-[var(--primary)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
            onClick={() => setMobileOpen(false)}
          >
            {nav("partners")}
          </Link>

          {/* Пресс-центр — верхний уровень (зеркало десктопной навигации) */}
          <Link
            href={`/${locale}/press`}
            className="block rounded-[var(--radius-sm)] px-3 py-2.5 text-sm font-medium text-[var(--text-2)] hover:bg-[var(--primary-soft)] hover:text-[var(--primary)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
            onClick={() => setMobileOpen(false)}
          >
            {nav("press")}
          </Link>

          <Link
            href={`/${locale}/contacts`}
            className="block rounded-[var(--radius-sm)] px-3 py-2.5 text-sm font-medium text-[var(--text-2)] hover:bg-[var(--primary-soft)] hover:text-[var(--primary)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
            onClick={() => setMobileOpen(false)}
          >
            {nav("contacts")}
          </Link>

          {/* Войти / кабинет — в мобильном меню (рабочий, через AuthProvider) */}
          <div className="mt-1 pt-2 border-t border-[var(--border-soft)]">
            <MobileAuthSlot onNavigate={() => setMobileOpen(false)} />
          </div>

          {/* Тема и язык — внизу бургера (на мобиле скрыты из шапки) */}
          <div className="mt-1 flex items-center gap-3 border-t border-[var(--border-soft)] px-3 pt-3 pb-1">
            <ThemeToggle />
            <LangSwitcher />
          </div>
        </div>
      </nav>
    </header>
  );
}
