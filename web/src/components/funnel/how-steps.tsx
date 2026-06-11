'use client';

// =====================================================
// ===== «Как получить финансирование» — 5 шагов ========
// Компактная версия процесса на главной (виденье руководителя):
// снимает страх «это сложно» до ухода со страницы. Полная версия
// с 7 этапами и каналами — /how-to-get.
// =====================================================

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';

export function HowSteps() {
  const t = useTranslations('funnel.howSteps');
  const pathname = usePathname();
  const locale = pathname.split('/')[1] || 'ru';
  const steps = t.raw('steps') as Array<{ t: string; d: string }>;

  return (
    <section className="container mx-auto px-4 pb-16 md:pb-20" aria-label={t('title')}>
      <div className="text-center">
        <h2 className="font-display text-2xl font-bold text-[var(--text)] md:text-3xl">
          {t('title')}
        </h2>
        <p className="mt-2 text-[var(--text-2)]">{t('sub')}</p>
      </div>

      <ol className="mt-9 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-5 lg:gap-4">
        {steps.map((s, i) => (
          <li key={i} className="relative flex gap-4 lg:flex-col lg:gap-0 lg:text-center">
            {/* Стрелка между шагами — только десктоп */}
            {i < steps.length - 1 && (
              <svg
                className="absolute -right-4 top-5 hidden h-4 w-6 text-[var(--border-strong)] lg:block"
                viewBox="0 0 24 16"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden="true"
              >
                <path d="M2 8h18M16 3l5 5-5 5" />
              </svg>
            )}
            <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[var(--primary)] font-display text-sm font-bold text-white lg:mx-auto">
              {i + 1}
            </span>
            <div className="lg:mt-3">
              <div className="font-semibold text-[var(--text)]">{s.t}</div>
              <div className="mt-1 text-sm leading-snug text-[var(--text-2)]">{s.d}</div>
            </div>
          </li>
        ))}
      </ol>

      <div className="mt-8 text-center">
        <Link
          href={`/${locale}/how-to-get`}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--primary)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] rounded"
        >
          {t('more')}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
    </section>
  );
}
