'use client';

// =====================================================
// ===== ESG-strip — полоса доверия «Устойчивое развитие»
// Идёт сразу после Hero. Тонированный брендовый бэнд с 5 показателями
// масштаба и ответственности: портфель · кредитные товарищества ·
// поддержанные фермеры · годы работы · ESG-рейтинг Sustainable Fitch.
// Информативный блок (без CTA) — призывы к действию живут в
// SustainabilityPromo рядом с ConstitutionBanner.
// Значения — из @/data/akk-stats (одна точка правки), подписи — из i18n.
// =====================================================

import { useTranslations } from 'next-intl';
import { AKK_ESG_STATS, yearsInOperation } from '@/data/akk-stats';

export function EsgStrip() {
  const t = useTranslations('funnel.esgStrip');

  // Портфель/кредитный рейтинг уже показаны в Hero — здесь только
  // ESG/масштаб-показатели, не дублируя hero (товарищества · фермеры ·
  // филиалы · годы · ESG-рейтинг).
  // accent: true — ESG-рейтинг, выделяем золотым (главный ESG-сигнал полосы).
  const stats: { value: string; label: string; accent?: boolean }[] = [
    { value: AKK_ESG_STATS.creditUnions, label: t('unionsLabel') },
    { value: AKK_ESG_STATS.farmers, label: t('farmersLabel') },
    { value: AKK_ESG_STATS.branches, label: t('branchesLabel') },
    { value: String(yearsInOperation()), label: t('yearsLabel') },
    { value: AKK_ESG_STATS.esgRating, label: t('ratingLabel'), accent: true },
  ];

  return (
    <section
      aria-label={t('eyebrow')}
      className="border-y border-[var(--border)] bg-[var(--primary-tint)]"
    >
      <div className="container mx-auto px-4 py-7 md:py-9">
        {/* Эйбрау-метка — связывает полосу с темой устойчивого развития */}
        <div className="mb-5 flex items-center gap-2">
          <span
            className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--primary-soft)] text-[var(--primary)]"
            aria-hidden="true"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-3.5 w-3.5"
            >
              <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
              <path d="M2 22c1.5-2 3-3.5 5-5" />
            </svg>
          </span>
          <span className="text-xs font-semibold uppercase tracking-wide text-[var(--text-2)]">
            {t('eyebrow')}
          </span>
        </div>

        <dl className="grid grid-cols-2 gap-x-6 gap-y-6 sm:grid-cols-3 lg:grid-cols-5">
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
