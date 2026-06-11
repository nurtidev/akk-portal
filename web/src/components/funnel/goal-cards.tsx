'use client';

// =====================================================
// ===== Карточки целей «На что вам нужны средства?» ====
// Паттерн из виденья руководителя: фермер думает целями, а не названиями
// программ. Клик = запуск квиза с предвыбранной целью (startQuizWith) —
// под капотом полный движок подбора, а не декоративные дропдауны.
// Тексты карточек — ИЗ ВОПРОСА КВИЗА (единый источник правды).
// =====================================================

import { useTranslations } from 'next-intl';
import { QUESTIONS } from '@/data/questions';
import { useFunnel } from './funnel-context';
import { useQuestionL10n } from './use-question-l10n';

const purposeQuestion = QUESTIONS.find((q) => q.key === 'purpose');

/** Иконки по значению цели (стиль — линейные, как в карточках программ). */
function GoalIcon({ value }: { value: string }) {
  const common = {
    width: 34,
    height: 34,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.6,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  };
  switch (value) {
    case 'vprir': // колос
      return (
        <svg {...common}>
          <path d="M12 21V9" />
          <path d="M12 9c0-2.2 1.6-3.8 3.8-3.8C15.8 7.4 14.2 9 12 9zM12 9c0-2.2-1.6-3.8-3.8-3.8C8.2 7.4 9.8 9 12 9z" />
          <path d="M12 14.5c0-2.2 1.6-3.8 3.8-3.8C15.8 12.9 14.2 14.5 12 14.5zM12 14.5c0-2.2-1.6-3.8-3.8-3.8C8.2 12.9 9.8 14.5 12 14.5z" />
        </svg>
      );
    case 'livestock': // корова
      return (
        <svg {...common}>
          <path d="M5 9c-1.2 0-2-1-2-2.2C3 5.5 3.8 5 4.6 5.4M19 9c1.2 0 2-1 2-2.2C21 5.5 20.2 5 19.4 5.4" />
          <path d="M5 7c0 5 3 8.5 7 8.5s7-3.5 7-8.5" />
          <path d="M9 19c0-1.7 1.3-3 3-3s3 1.3 3 3" />
        </svg>
      );
    case 'feedlot': // птица
      return (
        <svg {...common}>
          <path d="M16 7c2.8 0 5 2.2 5 5 0 4-3.5 7-8 7H4l3-3.5C5.2 14 4.5 12 4.5 10 4.5 6.4 7.4 4 11 4c2.3 0 4 1.2 5 3z" />
          <circle cx="15.5" cy="8.5" r="0.6" fill="currentColor" stroke="none" />
        </svg>
      );
    case 'investments': // техника/шестерёнка-трактор
      return (
        <svg {...common}>
          <circle cx="7.5" cy="17" r="3" />
          <circle cx="17.5" cy="17.5" r="2" />
          <path d="M10.5 17h5M5 14V8h6l2 4h5.5a2 2 0 0 1 2 2v1.5" />
          <path d="M8 8V5h3" />
        </svg>
      );
    case 'working': // монеты
      return (
        <svg {...common}>
          <ellipse cx="12" cy="6.5" rx="7" ry="3" />
          <path d="M5 6.5V12c0 1.7 3.1 3 7 3s7-1.3 7-3V6.5" />
          <path d="M5 12v5.5c0 1.7 3.1 3 7 3s7-1.3 7-3V12" />
        </svg>
      );
    default: // micro — росток
      return (
        <svg {...common}>
          <path d="M12 21v-9" />
          <path d="M12 12C12 8 9 5.5 5 5.5 5 9.5 8 12 12 12z" />
          <path d="M12 14c0-3 2.4-5.2 6-5.2 0 3-2.4 5.2-6 5.2z" />
        </svg>
      );
  }
}

export function GoalCards() {
  const t = useTranslations('funnel.goals');
  const qt = useQuestionL10n();
  const { startQuizWith } = useFunnel();
  const options = purposeQuestion?.options ?? [];

  return (
    <section className="container mx-auto px-4 pb-16 md:pb-20" aria-label={t('title')}>
      <div className="text-center">
        <h2 className="font-display text-2xl font-bold text-[var(--text)] md:text-3xl">
          {t('title')}
        </h2>
        <p className="mt-2 text-[var(--text-2)]">{t('sub')}</p>
      </div>
      <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-6">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => startQuizWith(o.value)}
            className="group flex flex-col items-center rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] px-3 py-6 text-center shadow-[var(--shadow-sm)] transition hover:-translate-y-0.5 hover:border-[var(--primary)] hover:shadow-[var(--shadow)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
          >
            <span className="text-[var(--primary)]">
              <GoalIcon value={o.value} />
            </span>
            <span className="mt-3 text-sm font-semibold leading-snug text-[var(--text)]">
              {purposeQuestion ? qt.optLabel(purposeQuestion, o.value) : o.label}
            </span>
            {purposeQuestion && qt.optDesc(purposeQuestion, o.value) && (
              <span className="mt-1.5 hidden text-[11px] leading-snug text-[var(--text-3)] sm:block">
                {qt.optDesc(purposeQuestion, o.value)}
              </span>
            )}
            <span className="mt-3 text-xs font-semibold text-[var(--primary)] opacity-0 transition group-hover:opacity-100">
              {t('cta')} →
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
