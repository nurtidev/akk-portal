'use client';

// =====================================================
// ===== Бенто-блок «Почему АКК» =======================
// Паттерн нео-финтех (Halyk/BCC): плитки доверия с крупными цифрами между
// hero и сеткой программ. Цифры реальные — источники: agrocredit.kz
// (инвестпроекты, рейтинги — docs/source/agrocredit-content.md).
// =====================================================

import { useTranslations } from 'next-intl';

export function WhyAkk() {
  const t = useTranslations('funnel.whyAkk');

  return (
    <section className="container mx-auto px-4 pb-16 md:pb-20" aria-label={t('title')}>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        {/* Плитка-якорь: объём финансирования (зелёная, с орнаментом) */}
        <div className="relative col-span-2 overflow-hidden rounded-[var(--radius-lg)] bg-[var(--primary)] p-6 text-white">
          <div
            className="ornament-tile pointer-events-none absolute inset-0"
            aria-hidden="true"
            style={{ opacity: 0.08, filter: 'brightness(3) saturate(0.5)' }}
          />
          <div className="relative">
            <div className="font-display text-3xl font-bold md:text-4xl">{t('a.value')}</div>
            <div className="mt-1.5 text-sm text-white/85">{t('a.label')}</div>
            <div className="mt-3 text-xs text-white/60">{t('a.note')}</div>
          </div>
        </div>

        <Tile value={t('b.value')} label={t('b.label')} note={t('b.note')} />
        <Tile value={t('c.value')} label={t('c.label')} />
        <Tile value={t('d.value')} label={t('d.label')} warm />

        {/* Байтерек: широкая плитка */}
        <div className="col-span-2 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--primary-soft)] p-6">
          <div className="font-display text-3xl font-bold text-[var(--primary)] md:text-4xl">
            {t('e.value')}
          </div>
          <div className="mt-1.5 text-sm text-[var(--text-2)]">{t('e.label')}</div>
        </div>

        <Tile value={t('f.value')} label={t('f.label')} />
      </div>
    </section>
  );
}

function Tile({
  value,
  label,
  note,
  warm,
}: {
  value: string;
  label: string;
  note?: string;
  warm?: boolean;
}) {
  return (
    <div
      className={`rounded-[var(--radius-lg)] border border-[var(--border)] p-6 ${
        warm ? 'bg-[var(--surface-warm)]' : 'bg-[var(--surface)]'
      }`}
    >
      <div className="font-display text-3xl font-bold text-[var(--primary)] md:text-4xl">{value}</div>
      <div className="mt-1.5 text-sm leading-snug text-[var(--text-2)]">{label}</div>
      {note && <div className="mt-2 text-xs text-[var(--text-3)]">{note}</div>}
    </div>
  );
}
