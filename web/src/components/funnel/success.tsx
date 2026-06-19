'use client';

// =====================================================
// ===== B6: Success (экран успеха с номером заявки) ===
// renderSuccess из легаси (≈ 4301–4315). Номер заявки — из submit() (мок/трек D).
// =====================================================

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { PROGRAMS } from '@/data/programs';
import { useFunnel } from './funnel-context';

export function Success() {
  const t = useTranslations('funnel.success');
  const locale = useLocale();
  const { state, reset } = useFunnel();
  const p = state.selectedProgram ? PROGRAMS.find((x) => x.id === state.selectedProgram) : null;

  return (
    <div className="mx-auto max-w-md text-center">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--success-soft)] text-3xl text-[var(--success)]">
        ✓
      </div>
      <h2 className="font-display text-2xl font-bold text-[var(--text)]">{t('title')}</h2>
      <div className="mt-2 text-[var(--text-2)]">
        {t('numberLabel')} <strong className="text-[var(--text)]">{state.leadNumber}</strong>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-[var(--text-2)]">
        {p ? t('textProgram', { title: p.title }) : t('text')}
      </p>
      <p className="mt-2 text-xs text-[var(--text-3)]">{t('urgent')}</p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Link
          href={`/${locale}/cabinet?tab=apps`}
          className="inline-flex h-12 items-center justify-center rounded-[var(--radius)] bg-[var(--primary)] px-6 font-semibold text-white transition hover:bg-[var(--primary-2)]"
        >
          {t('toCabinet')}
        </Link>
        <button
          type="button"
          onClick={reset}
          className="inline-flex h-12 items-center justify-center rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-6 font-semibold text-[var(--text-2)] transition hover:border-[var(--primary)]"
        >
          {t('back')}
        </button>
      </div>
    </div>
  );
}
