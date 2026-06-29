'use client';

// =====================================================
// ===== «Как получить финансирование» — 5 шагов ========
// Компактная версия процесса на главной (виденье руководителя).
// Своя полоса с фоном и щедрыми отступами — блок не должен выглядеть
// «сплющенным» рядом с сеткой программ. Полная версия — /how-to-get.
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
    <section
      className="py-16 md:py-24"
      aria-label={t('title')}
      style={{
        background:
          'linear-gradient(to bottom, var(--bg) 0, var(--surface) 120px, var(--surface) calc(100% - 120px), var(--bg) 100%)',
      }}
    >
      <div className="container mx-auto px-4">
        <div className="text-center">
          <h2 className="font-display text-2xl font-bold text-[var(--text)] md:text-3xl">
            {t('title')}
          </h2>
          <p className="mt-3 text-[var(--text-2)]">{t('sub')}</p>
        </div>

        <ol className="mx-auto mt-12 grid max-w-md grid-cols-1 gap-8 sm:max-w-2xl sm:grid-cols-2 lg:max-w-none lg:grid-cols-5 lg:gap-8">
          {steps.map((s, i) => (
            <li key={i} className="relative flex gap-5 lg:flex-col lg:gap-0 lg:text-center">
              {/* Стрелка между шагами — только десктоп */}
              {i < steps.length - 1 && (
                <svg
                  className="absolute -right-6 top-6 hidden h-5 w-8 text-[var(--border-strong)] lg:block"
                  viewBox="0 0 24 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  aria-hidden="true"
                >
                  <path d="M2 8h18M16 3l5 5-5 5" />
                </svg>
              )}
              <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-[var(--primary)] font-display text-base font-bold text-white shadow-[0_0_0_6px_var(--primary-soft)] lg:mx-auto">
                {i + 1}
              </span>
              <div className="lg:mt-5">
                <div className="text-[15px] font-semibold leading-snug text-[var(--text)]">
                  {s.t}
                </div>
                <div className="mx-auto mt-1.5 max-w-[220px] text-sm leading-relaxed text-[var(--text-2)]">
                  {s.d}
                </div>
              </div>
            </li>
          ))}
        </ol>

        <div className="mt-12 text-center">
          <Link
            href={`/${locale}/how-to-get`}
            className="inline-flex h-11 items-center gap-2 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg)] px-6 text-sm font-semibold text-[var(--text-2)] transition hover:border-[var(--primary)] hover:text-[var(--primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
          >
            {t('more')}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  );
}
