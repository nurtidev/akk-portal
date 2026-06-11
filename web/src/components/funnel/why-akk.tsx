'use client';

// =====================================================
// ===== Статс-полоса «Почему АКК» ======================
// Компактная полоса показателей под hero (виденье руководителя) —
// вместо тяжёлого бенто. Цифры реальные: agrocredit.kz
// (docs/source/agrocredit-content.md).
// =====================================================

import { useTranslations } from 'next-intl';

const ITEMS = ['a', 'b', 'c', 'd', 'e'] as const;

export function WhyAkk() {
  const t = useTranslations('funnel.whyAkk');

  return (
    <section className="container mx-auto px-4 pb-14 md:pb-16" aria-label={t('title')}>
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--border)] shadow-[var(--shadow-sm)] sm:grid-cols-3 lg:grid-cols-5">
        {ITEMS.map((k) => (
          <div
            key={k}
            className="flex flex-col justify-center bg-[var(--surface)] px-5 py-5 last:col-span-2 sm:last:col-span-1"
          >
            <div className="font-display text-xl font-bold text-[var(--primary)] md:text-2xl">
              {t(`${k}.value`)}
            </div>
            <div className="mt-1 text-xs leading-snug text-[var(--text-2)]">{t(`${k}.label`)}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
