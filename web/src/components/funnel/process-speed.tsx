'use client';

// =====================================================
// ProcessSpeed — блок «Быстро и онлайн» (цифровой процесс) на главной.
// Приём с bankffin.kz/ipoteka (полукруглые гейджи скорости). Значения —
// из @/data/akk-stats (AKK_SPEED_STATS; `decision` черновой, TODO),
// подписи — из i18n funnel.speed. Гейдж декоративный (fill 0..1).
// =====================================================

import { useTranslations } from 'next-intl';
import { AKK_SPEED_STATS } from '@/data/akk-stats';

/** Полукруглый гейдж: серый трек + зелёная дуга на fill (0..1). */
function Gauge({ fill }: { fill: number }) {
  const a = Math.PI * (1 - Math.min(Math.max(fill, 0), 1)); // π (лево) → 0 (право)
  const ex = (50 + 40 * Math.cos(a)).toFixed(2);
  const ey = (50 - 40 * Math.sin(a)).toFixed(2);
  return (
    <svg viewBox="0 0 100 56" className="h-14 w-24" aria-hidden="true">
      <path
        d="M10 50 A40 40 0 0 1 90 50"
        fill="none"
        stroke="var(--border)"
        strokeWidth="7"
        strokeLinecap="round"
      />
      <path
        d={`M10 50 A40 40 0 0 1 ${ex} ${ey}`}
        fill="none"
        stroke="var(--primary)"
        strokeWidth="7"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function ProcessSpeed() {
  const t = useTranslations('funnel.speed');

  return (
    <section aria-label={t('eyebrow')} className="bg-[var(--bg-tint)]">
      <div className="container mx-auto px-4 py-14 md:py-20">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <div className="mb-2 text-sm font-semibold uppercase tracking-wide text-[var(--accent-2)]">
            {t('eyebrow')}
          </div>
          <h2 className="font-display text-3xl font-bold text-[var(--text)] md:text-4xl">
            {t('title')}
          </h2>
          <p className="mt-3 text-[var(--text-2)]">{t('lede')}</p>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          {AKK_SPEED_STATS.map((s) => (
            <div
              key={s.key}
              className="flex flex-col items-center rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-6 text-center shadow-[var(--shadow-sm)]"
            >
              <Gauge fill={s.fill} />
              <div className="mt-1 font-display text-3xl font-bold text-[var(--primary)]">
                {s.value}
              </div>
              <div className="mt-1.5 text-sm font-medium text-[var(--text-2)]">
                {t(`items.${s.key}`)}
              </div>
            </div>
          ))}
        </div>

        <p className="mt-6 text-center text-xs text-[var(--text-3)]">{t('note')}</p>
      </div>
    </section>
  );
}
