'use client';

// =====================================================
// ===== ConstitutionBanner — баннер «Конституция» =====
// Горизонтальная карточка-ссылка: SVG-книга + текст.
// Располагается между ChairmanTeaser и SuccessStories,
// аналогично виджету на agrocredit.kz.
// Ведёт на /{locale}/constitution.
// =====================================================

import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';

export function ConstitutionBanner() {
  const t = useTranslations('funnel.constitutionBanner');
  const locale = useLocale();

  return (
    <section className="container mx-auto px-4 pb-14 md:pb-16">
      <Link
        href={`/${locale}/constitution`}
        className="
          group flex flex-row items-center gap-5 md:gap-6
          rounded-[var(--radius-lg)] border border-[var(--border)]
          bg-[var(--surface)] p-5 md:p-6
          shadow-[var(--shadow-sm)]
          transition duration-200
          hover:-translate-y-0.5
          hover:border-[var(--primary)]
          hover:shadow-md
          focus-visible:outline-none
          focus-visible:ring-2
          focus-visible:ring-[var(--primary)]
        "
        aria-label={t('title')}
      >
        {/* SVG-иллюстрация книги в фирменных цветах */}
        <div className="flex-shrink-0 flex items-center justify-center w-16 h-20 md:w-20 md:h-24" aria-hidden="true">
          <svg
            viewBox="0 0 80 96"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-full"
          >
            {/* Тень под книгой */}
            <ellipse cx="40" cy="91" rx="22" ry="3.5" fill="var(--border)" opacity="0.6" />

            {/* Задняя страница (слегка смещена вправо-вверх) */}
            <rect x="14" y="8" width="54" height="72" rx="4" fill="var(--primary)" opacity="0.18" />

            {/* Основная обложка книги */}
            <rect x="10" y="5" width="54" height="74" rx="4" fill="var(--primary)" />

            {/* Корешок книги — тёмная полоска слева */}
            <rect x="10" y="5" width="9" height="74" rx="4" fill="#054d2e" />
            {/* Скругление корешка справа (поверх) */}
            <rect x="15" y="5" width="4" height="74" fill="#054d2e" />

            {/* Страницы — правый торец */}
            <rect x="62" y="9" width="5" height="66" rx="2" fill="#f0ead6" />
            <line x1="62" y1="14" x2="67" y2="14" stroke="#e0d8c4" strokeWidth="0.8" />
            <line x1="62" y1="20" x2="67" y2="20" stroke="#e0d8c4" strokeWidth="0.8" />
            <line x1="62" y1="26" x2="67" y2="26" stroke="#e0d8c4" strokeWidth="0.8" />
            <line x1="62" y1="32" x2="67" y2="32" stroke="#e0d8c4" strokeWidth="0.8" />
            <line x1="62" y1="38" x2="67" y2="38" stroke="#e0d8c4" strokeWidth="0.8" />
            <line x1="62" y1="44" x2="67" y2="44" stroke="#e0d8c4" strokeWidth="0.8" />
            <line x1="62" y1="50" x2="67" y2="50" stroke="#e0d8c4" strokeWidth="0.8" />
            <line x1="62" y1="56" x2="67" y2="56" stroke="#e0d8c4" strokeWidth="0.8" />
            <line x1="62" y1="62" x2="67" y2="62" stroke="#e0d8c4" strokeWidth="0.8" />
            <line x1="62" y1="68" x2="67" y2="68" stroke="#e0d8c4" strokeWidth="0.8" />

            {/* Акцентная горизонтальная полоса — золото */}
            <rect x="19" y="22" width="34" height="4" rx="1.5" fill="var(--accent)" opacity="0.9" />

            {/* Декоративные линии на обложке (имитация текста) */}
            <rect x="19" y="32" width="26" height="2.5" rx="1.2" fill="white" opacity="0.35" />
            <rect x="19" y="38" width="20" height="2.5" rx="1.2" fill="white" opacity="0.25" />
            <rect x="19" y="44" width="28" height="2.5" rx="1.2" fill="white" opacity="0.2" />

            {/* Нижняя золотая полоска */}
            <rect x="19" y="62" width="34" height="3" rx="1.5" fill="var(--accent)" opacity="0.6" />

            {/* Блик в левом верхнем углу обложки */}
            <path d="M14 9 Q14 5 18 5 L26 5 Q16 8 14 17 Z" fill="white" opacity="0.06" />
          </svg>
        </div>

        {/* Текстовый блок */}
        <div className="flex-1 min-w-0">
          <p className="font-display font-semibold text-base md:text-lg text-[var(--text)] leading-snug group-hover:text-[var(--primary)] transition-colors duration-200">
            {t('title')}
          </p>
          <p className="mt-1 text-sm text-[var(--text-2)]">
            {t('subtitle')}
          </p>
        </div>

        {/* Стрелка вправо */}
        <div className="flex-shrink-0 text-[var(--text-2)] group-hover:text-[var(--primary)] transition-colors duration-200" aria-hidden="true">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </div>
      </Link>
    </section>
  );
}
