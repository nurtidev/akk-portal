'use client';

// =====================================================
// ===== SustainabilityPromo — блок «Устойчивое развитие»
// Карточка: SVG-лист + заголовок + текст + два CTA, а ПОД ними —
// сетка из 5 показателей масштаба и ответственности (кредитные
// товарищества · фермеры · филиалы · годы работы · ESG-рейтинг).
// Раньше показатели жили отдельной полосой EsgStrip — сведены сюда,
// чтобы тема устойчивого развития читалась единым блоком.
//   · Подробнее → /{locale}/sustainability (контентная страница УР)
//   · Зелёный кредит для фермы → existing consultation flow (лидген)
// Значения показателей — из @/data/akk-stats, подписи — funnel.esgStrip.
// =====================================================

import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import { track } from '@/lib/analytics';
import { AKK_ESG_STATS, yearsInOperation } from '@/data/akk-stats';
import { useFunnel } from './funnel-context';

export function SustainabilityPromo() {
  const t = useTranslations('funnel.sustainabilityPromo');
  const te = useTranslations('funnel.esgStrip');
  const locale = useLocale();
  const { requestConsultation } = useFunnel();

  // 5 показателей УР. accent: true — ESG-рейтинг, выделяем золотым
  // (главный ESG-сигнал блока).
  const stats: { value: string; label: string; accent?: boolean }[] = [
    { value: AKK_ESG_STATS.creditUnions, label: te('unionsLabel') },
    { value: AKK_ESG_STATS.farmers, label: te('farmersLabel') },
    { value: AKK_ESG_STATS.branches, label: te('branchesLabel') },
    { value: String(yearsInOperation()), label: te('yearsLabel') },
    { value: AKK_ESG_STATS.esgRating, label: te('ratingLabel'), accent: true },
  ];

  // Вторичный CTA «Зелёный кредит для фермы» — переиспользует существующий
  // поток консультации (лидген): анкета ESG для аграриев — отдельная задача,
  // пока ведём в проверенную форму обратной связи.
  const onGreenLead = () => {
    track('esg_promo_lead', { source: 'home_banner' });
    requestConsultation();
  };

  return (
    <section className="container mx-auto px-4 py-14 md:py-16" aria-label={t('title')}>
      <div
        className="
          overflow-hidden rounded-[var(--radius-lg)]
          border border-[var(--border)] bg-[var(--surface)]
          p-5 shadow-[var(--shadow-sm)] md:p-6
        "
      >
        {/* Шапка блока: иконка + текст + CTA */}
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          {/* Иконка-лист в брендовом круге */}
          <div
            className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-[var(--primary-soft)] text-[var(--primary)]"
            aria-hidden="true"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-7 w-7"
            >
              <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
              <path d="M2 22c1.5-2 3-3.5 5-5" />
            </svg>
          </div>

          {/* Текстовый блок */}
          <div className="min-w-0 flex-1">
            <p className="font-display text-base font-semibold leading-snug text-[var(--text)] md:text-lg">
              {t('title')}
            </p>
            <p className="mt-1 text-sm leading-relaxed text-[var(--text-2)]">{t('text')}</p>
          </div>

          {/* CTA-группа */}
          <div className="flex flex-shrink-0 flex-col gap-2.5 sm:flex-row sm:items-center">
            <Link
              href={`/${locale}/sustainability`}
              onClick={() => track('esg_promo_more', { source: 'home_banner' })}
              className="
                group inline-flex h-11 items-center justify-center gap-2 rounded-[var(--radius)]
                bg-[var(--primary)] px-5 text-sm font-semibold text-white
                shadow-[var(--shadow-sm)] transition
                hover:bg-[var(--primary-2)] hover:shadow-md
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2
              "
            >
              {t('ctaPrimary')}
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
              >
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </Link>
            <button
              type="button"
              onClick={onGreenLead}
              className="
                inline-flex h-11 items-center justify-center rounded-[var(--radius)]
                border border-[var(--border)] bg-[var(--surface)] px-5 text-sm font-semibold text-[var(--text)]
                shadow-[var(--shadow-sm)] transition
                hover:border-[var(--primary)] hover:text-[var(--primary)] hover:shadow-md
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2
              "
            >
              {t('ctaSecondary')}
            </button>
          </div>
        </div>

        {/* Показатели УР — отдельной строкой под шапкой, через разделитель */}
        <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-6 border-t border-[var(--border)] pt-6 sm:grid-cols-3 lg:grid-cols-5">
          {stats.map((s, i) => (
            <div
              key={i}
              className={`border-l-2 pl-3 ${
                s.accent ? 'border-[var(--accent)]' : 'border-[var(--primary)]'
              }`}
            >
              <dt
                className={`whitespace-nowrap font-display text-xl font-bold leading-tight md:text-2xl ${
                  s.accent ? 'text-[var(--accent-2)]' : 'text-[var(--primary)]'
                }`}
              >
                {s.value}
              </dt>
              <dd className="mt-1 text-xs font-medium leading-snug text-[var(--text-2)]">
                {s.label}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
