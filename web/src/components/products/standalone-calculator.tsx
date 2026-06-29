'use client';

// =====================================================
// StandaloneCalculator — публичный калькулятор на отдельной странице /calculator.
// Фидбэк дизайнера: «калькулятор вытащить отдельно». Сначала выбор программы
// (расчёт зависит от ставки/схемы/потолков), затем тот же ProductCalculator,
// что и на странице продукта (золотая логика @/lib/schedule, локальный стейт).
// Публичный pre-screen: без выбора ОС/ПОС/облигаций и без полной формы Fajr.
// =====================================================

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import * as Tooltip from '@radix-ui/react-tooltip';
import { PROGRAMS } from '@/data/programs';
import { fmtAmount } from '@/lib/format';
import { ProductCalculator } from './product-calculator';
import { RateDisplay } from '@/components/funnel/rate-display';

// Видимые программы, featured — первой (как в обзоре).
const VISIBLE = PROGRAMS.filter((p) => !p.hidden);
const ORDERED = VISIBLE.filter((p) => p.featured).concat(VISIBLE.filter((p) => !p.featured));

export function StandaloneCalculator() {
  const t = useTranslations('content.calculator');
  const tp = useTranslations('funnel.programs');
  const pathname = usePathname();
  const locale = pathname.split('/')[1] || 'ru';

  const [id, setId] = useState(ORDERED[0].id);
  const program = ORDERED.find((p) => p.id === id) ?? ORDERED[0];

  return (
    <Tooltip.Provider delayDuration={150}>
    <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)] lg:items-start">
      {/* Левая колонка: выбор программы + краткие условия */}
      <aside className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-sm)] lg:sticky lg:top-24">
        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold text-[var(--text-2)]">
            {t('programLabel')}
          </span>
          <span className="relative block">
            <select
              value={id}
              onChange={(e) => setId(e.target.value)}
              className="h-12 w-full appearance-none rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] pl-3.5 pr-9 text-sm font-medium text-[var(--text)] shadow-[var(--shadow-sm)] transition focus-visible:border-[var(--primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
            >
              {ORDERED.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
            <svg
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-3)]"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </span>
        </label>

        {/* Краткие условия выбранной программы */}
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <dt className="text-[var(--text-3)]">{tp('rate')}</dt>
            <dd className="font-semibold text-[var(--text)]">
              <RateDisplay program={program} />
            </dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-[var(--text-3)]">{tp('amountUpTo')}</dt>
            <dd className="font-semibold text-[var(--text)]">{fmtAmount(program.maxAmount)}</dd>
          </div>
        </dl>

        <Link
          href={`/${locale}/products/${program.id}`}
          className="mt-5 inline-flex h-11 w-full items-center justify-center rounded-[var(--radius)] bg-[var(--primary)] px-5 text-sm font-semibold text-white transition hover:bg-[var(--primary-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2"
        >
          {t('ctaApply')}
        </Link>
      </aside>

      {/* Правая колонка: сам расчёт (remount при смене программы — re-init стейта) */}
      <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-sm)] md:p-6">
        <h2 className="font-display text-xl font-bold text-[var(--text)]">{program.title}</h2>
        <ProductCalculator key={program.id} program={program} />
        <p className="mt-5 rounded-[var(--radius)] bg-[var(--surface-warm)] px-4 py-3 text-xs leading-relaxed text-[var(--text-3)]">
          {t('disclaimer')}
        </p>
      </div>
    </div>
    </Tooltip.Provider>
  );
}
