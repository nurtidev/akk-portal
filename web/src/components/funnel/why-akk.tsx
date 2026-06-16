'use client';

// =====================================================
// ===== Блок «АКК в цифрах» — карточки с иконками ======
// Ключевые показатели достижений сразу под hero (hero + цифры = один экран).
// Главные цифры (портфель, клиенты, финансирование) тянутся из
// src/data/akk-stats.ts — обновлять раз в месяц только там.
// Метки этих цифр переиспользуются из funnel.hero.stat*Label.
// Плюс факт доверия — рейтинг Fitch (из i18n whyAkk). Итого 4 карточки в ряд.
// Каждый показатель отображается в отдельной карточке с линейной SVG-иконкой.
// =====================================================

import { useTranslations } from 'next-intl';
import { AKK_STATS } from '@/data/akk-stats';

// --------------------------------------------------
// Типы
// --------------------------------------------------
type IconKey = 'portfolio' | 'clients' | 'financed' | 'years' | 'rating' | 'branches';

// --------------------------------------------------
// Иконки — линейные SVG 24×24, stroke currentColor,
// strokeWidth 1.7, fill none, по смыслу показателя.
// --------------------------------------------------
function StatIcon({ icon }: { icon: IconKey }) {
  switch (icon) {
    // Кредитный портфель — кошелёк
    case 'portfolio':
      return (
        <svg
          width={24}
          height={24}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.7}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M20 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2Z" />
          <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
          <path d="M12 12v.01" strokeWidth={2.2} />
          <circle cx={12} cy={12} r={1} fill="currentColor" />
        </svg>
      );

    // Клиенты — группа людей
    case 'clients':
      return (
        <svg
          width={24}
          height={24}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.7}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <circle cx={9} cy={7} r={3} />
          <path d="M3 20c0-3.3 2.7-6 6-6" />
          <circle cx={17} cy={7} r={3} />
          <path d="M11.5 14.3c.8-.2 1.6-.3 2.5-.3 3.3 0 6 2.7 6 6" />
          <path d="M3 20h12" />
        </svg>
      );

    // Профинансировано — рука с монетами (рост)
    case 'financed':
      return (
        <svg
          width={24}
          height={24}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.7}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
          <polyline points="17 6 23 6 23 12" />
        </svg>
      );

    // Лет работы — награда/медаль
    case 'years':
      return (
        <svg
          width={24}
          height={24}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.7}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <circle cx={12} cy={9} r={5} />
          <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
        </svg>
      );

    // Рейтинг Fitch BBB — щит надёжности
    case 'rating':
      return (
        <svg
          width={24}
          height={24}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.7}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
          <polyline points="9 12 11 14 15 10" />
        </svg>
      );

    // Филиалы — метка на карте
    case 'branches':
      return (
        <svg
          width={24}
          height={24}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.7}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M20 10c0 6-8 13-8 13s-8-7-8-13a8 8 0 1 1 16 0Z" />
          <circle cx={12} cy={10} r={2.5} />
        </svg>
      );

    default:
      return null;
  }
}

// --------------------------------------------------
// Компонент карточки показателя
// --------------------------------------------------
function StatCard({ value, label, icon }: { value: string; label: string; icon: IconKey }) {
  return (
    <div
      className={[
        // Базовое оформление карточки
        'flex flex-col items-center text-center',
        'rounded-[var(--radius-lg)] border border-[var(--border)]',
        'bg-[var(--surface)] shadow-[var(--shadow-sm)]',
        'p-5 md:p-6',
        // Плавный hover — лёгкий подъём + усиление тени
        'transition-all duration-200 ease-out',
        'hover:-translate-y-0.5 hover:shadow-md',
      ].join(' ')}
    >
      {/* Круг с иконкой */}
      <div
        className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--primary-soft)] text-[var(--primary)]"
        aria-hidden
      >
        <StatIcon icon={icon} />
      </div>

      {/* Числовое значение */}
      <div className="font-display text-2xl font-bold leading-tight text-[var(--primary)] md:text-3xl">
        {value}
      </div>

      {/* Подпись */}
      <div className="mt-1.5 text-xs leading-snug text-[var(--text-2)] md:text-sm">
        {label}
      </div>
    </div>
  );
}

// --------------------------------------------------
// Основной компонент секции
// --------------------------------------------------
export function WhyAkk() {
  const t = useTranslations('funnel.whyAkk');
  // Метки достижений уже есть в локалях под funnel.hero — переиспользуем,
  // чтобы не дублировать строки в трёх языках.
  const th = useTranslations('funnel.hero');

  // Данные карточек — значения и метки из тех же источников, что и раньше.
  // Добавляем только ключ иконки для каждого показателя.
  const items: { value: string; label: string; icon: IconKey }[] = [
    { value: AKK_STATS.portfolio,           label: th('statPortfolioLabel'),  icon: 'portfolio' },
    { value: AKK_STATS.clients,             label: th('statClientsLabel'),     icon: 'clients'   },
    { value: AKK_STATS.financed,            label: th('statFinancedLabel'),    icon: 'financed'  },
    { value: t('b.value'),                  label: t('b.label'),               icon: 'rating'    }, // рейтинг Fitch BBB
  ];

  return (
    <section className="container mx-auto px-4 pb-14 md:pb-16" aria-label={t('title')}>
      {/* Заголовок секции */}
      <h2 className="mb-5 font-display text-2xl font-bold text-[var(--text)] md:mb-6 md:text-3xl">
        {t('title')}
      </h2>

      {/* Сетка карточек: 2 колонки на мобиле, 4 в один ряд на sm+ */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {items.map((it, i) => (
          <StatCard key={i} value={it.value} label={it.label} icon={it.icon} />
        ))}
      </div>
    </section>
  );
}
