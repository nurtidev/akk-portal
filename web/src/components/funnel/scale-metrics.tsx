'use client';

// =====================================================
// ScaleMetrics — блок «Масштаб АКК» на главной (заменил стену партнёров
// ClientTrust по запросу ПП: «не рекламировать партнёров — показать масштаб»).
// Значения — из @/data/akk-stats (AKK_SCALE_STATS, одна точка правки, ЧЕРНОВЫЕ),
// подписи — из i18n (funnel.scale). Иконки: псевдо-3D бейдж (градиент+тень) с
// Lucide-иконкой; если дизайнер положит реальный 3D-рендер в /img/scale/{key}.png —
// он автоматически перекроет бейдж (см. docs/IMAGE_PROMPTS.md).
// =====================================================

import { useTranslations } from 'next-intl';
import { Beef, Users, LandPlot, PieChart, Tractor, type LucideIcon } from 'lucide-react';
import { AKK_SCALE_STATS } from '@/data/akk-stats';

const ICONS: Record<string, LucideIcon> = {
  horsemeat: Beef,
  clients: Users,
  land: LandPlot,
  apkShare: PieChart,
  mtPark: Tractor,
};

function ScaleIcon({ k }: { k: string }) {
  const Icon = ICONS[k] ?? PieChart;
  return (
    <div className="relative mx-auto mb-4 h-16 w-16">
      {/* Псевдо-3D бейдж (фолбэк, пока нет реального 3D-рендера) */}
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--primary)] to-[var(--primary-2)] shadow-[0_10px_22px_-8px_rgba(7,102,61,0.55)] ring-1 ring-white/15">
        <Icon className="h-8 w-8 text-white" strokeWidth={1.7} aria-hidden="true" />
      </div>
      {/* Реальный 3D-рендер (если файл есть) — перекрывает бейдж, иначе скрыт по onError */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/img/scale/${k}.png`}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 h-full w-full object-contain"
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).style.display = 'none';
        }}
      />
    </div>
  );
}

export function ScaleMetrics() {
  const t = useTranslations('funnel.scale');

  return (
    <section
      aria-label={t('eyebrow')}
      className="border-y border-[var(--border)] bg-[var(--primary-tint)]"
    >
      <div className="container mx-auto px-4 py-14 md:py-20">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <div className="mb-2 text-sm font-semibold uppercase tracking-wide text-[var(--accent-2)]">
            {t('eyebrow')}
          </div>
          <h2 className="font-display text-3xl font-bold text-[var(--text)] md:text-4xl">
            {t('title')}
          </h2>
        </div>

        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6 lg:grid-cols-5">
          {AKK_SCALE_STATS.map((s) => (
            <div
              key={s.key}
              className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-5 text-center shadow-[var(--shadow-sm)]"
            >
              <ScaleIcon k={s.key} />
              <dt className="font-display text-3xl font-bold leading-none text-[var(--primary)] md:text-4xl">
                {s.value}
              </dt>
              <dd className="mt-3 text-sm font-medium leading-snug text-[var(--text-2)]">
                {t(`items.${s.key}`)}
              </dd>
            </div>
          ))}
        </dl>

        {/* Весь сектор — АКК объединяет все фининституты АПК */}
        <div className="mt-10 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-6 py-5 text-center">
          <p className="font-display text-base font-semibold text-[var(--text)]">
            {t('sectorLabel')}
          </p>
          <p className="mt-1.5 text-sm text-[var(--text-3)]">{t('sectorItems')}</p>
        </div>
      </div>
    </section>
  );
}
