'use client';

// =====================================================
// ===== ProgramShowcase — «программа + калькулятор» со стрелками
// Сверху — стрелки ‹ › (листать программы по кругу) + точки-индикатор позиции.
// Ниже два блока рядом: слева карточка активной программы (фото + краткое
// описание + условия + CTA), справа — отдельный блок калькулятора этой
// программы (funnel-Calculator пишет сумму/срок в единый стор → «Подать
// заявку» подхватывает их через applyDirect). На мобиле — стопкой.
// Все 7 программ доступны (включая indirectOnly — инвариант обзора), featured
// идёт первой. Заменяет прежний master-detail со списком слева.
// =====================================================

import { useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { PROGRAMS } from '@/data/programs';
import { fmtAmount } from '@/lib/format';
import { useFunnel } from './funnel-context';
import { Calculator } from './calculator';
import { RateDisplay } from './rate-display';
import { ProgramIcon, ProgramPhoto } from './program-media';
import { useProgramL10n } from './use-program-l10n';

const VISIBLE = PROGRAMS.filter((p) => !p.hidden);
const ORDERED = VISIBLE.filter((p) => p.featured).concat(VISIBLE.filter((p) => !p.featured));
const TOTAL = ORDERED.length;

// Склонение «год/года/лет» (kk — все формы «жыл», en — yr/yrs через i18n).
function ruPluralForm(n: number): 'One' | 'Few' | 'Many' {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return 'One';
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return 'Few';
  return 'Many';
}
function formatTerm(months: number, t: (key: string) => string): string {
  if (months >= 24 && months % 12 === 0) {
    const years = months / 12;
    return `${years} ${t('year' + ruPluralForm(years))}`;
  }
  return `${months} ${t('months')}`;
}

function StarIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}

function NavArrow({
  dir,
  label,
  onClick,
}: {
  dir: 'prev' | 'next';
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex h-11 w-11 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--text-2)] shadow-[var(--shadow-sm)] transition hover:border-[var(--primary)] hover:text-[var(--primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
        {dir === 'prev' ? <path d="M15 18l-6-6 6-6" /> : <path d="M9 18l6-6-6-6" />}
      </svg>
    </button>
  );
}

export function ProgramShowcase() {
  const t = useTranslations('funnel.programs');
  const lp = useProgramL10n();
  const { applyDirect, openProgramDetail } = useFunnel();
  const pathname = usePathname();
  const locale = pathname.split('/')[1] || 'ru';

  const [index, setIndex] = useState(0);
  const [hoverMedia, setHoverMedia] = useState(false); // курсор над фото активной программы
  const activeRaw = ORDERED[index];
  const active = lp.localize(activeRaw);

  const goTo = (i: number) => {
    const ni = ((i % TOTAL) + TOTAL) % TOTAL;
    setIndex(ni);
    openProgramDetail(ORDERED[ni].id);
  };

  // Свайп на мобиле для смены программы. Игнорируем жесты, начатые на
  // интерактивных элементах (слайдер/кнопки/ссылки/раскрывашка калькулятора),
  // и срабатываем только при явно горизонтальном движении — чтобы не
  // перехватывать вертикальный скролл страницы.
  const touch = useRef<{ x: number; y: number } | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    const el = e.target as HTMLElement;
    if (el.closest('input, button, a, select, details, [role="slider"]')) {
      touch.current = null;
      return;
    }
    const p = e.touches[0];
    touch.current = { x: p.clientX, y: p.clientY };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (!touch.current) return;
    const p = e.changedTouches[0];
    const dx = p.clientX - touch.current.x;
    const dy = p.clientY - touch.current.y;
    touch.current = null;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      goTo(index + (dx < 0 ? 1 : -1));
    }
  };

  return (
    <section
      id="programs"
      className="py-16 md:py-20"
      style={{
        background:
          'linear-gradient(to bottom, var(--bg) 0, var(--bg-tint) 120px, var(--bg-tint) calc(100% - 120px), var(--bg) 100%)',
      }}
    >
      <div className="container mx-auto px-4">
        {/* Шапка секции */}
        <div className="mx-auto mb-8 max-w-2xl text-center">
          <div className="mb-2 text-sm font-semibold uppercase tracking-wide text-[var(--accent-2)]">
            {t('eyebrow')}
          </div>
          <h2 className="font-display text-3xl font-bold text-[var(--text)] md:text-4xl">
            {t('title')}
          </h2>
          <p className="mt-3 text-[var(--text-2)]">{t('lede')}</p>
        </div>

        {/* Панель навигации: точки-индикатор слева + стрелки справа */}
        <div className="mb-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-1.5" role="tablist" aria-label={t('title')}>
            {ORDERED.map((p, i) => (
              <button
                key={p.id}
                type="button"
                role="tab"
                aria-selected={i === index}
                aria-label={lp.localize(p).title}
                onClick={() => goTo(i)}
                className={`h-2 rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 ${
                  i === index
                    ? 'w-6 bg-[var(--primary)]'
                    : 'w-2 bg-[var(--border-strong)] hover:bg-[var(--primary)]'
                }`}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="mr-1 text-sm font-medium text-[var(--text-3)]" aria-hidden="true">
              {index + 1} / {TOTAL}
            </span>
            <NavArrow dir="prev" label={t('prevAria')} onClick={() => goTo(index - 1)} />
            <NavArrow dir="next" label={t('nextAria')} onClick={() => goTo(index + 1)} />
          </div>
        </div>

        {/* Два блока рядом: программа | калькулятор. Без items-start →
            колонки тянутся на одинаковую высоту (grid stretch). На мобиле
            смену программы можно листать свайпом (onTouchStart/End). */}
        <div className="grid gap-6 lg:grid-cols-2" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
          {/* ЛЕВО: карточка программы + краткое описание */}
          <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-sm)]">
            <div
              className="relative aspect-[16/9] overflow-hidden bg-gradient-to-br from-[var(--primary)] to-[var(--primary-2)]"
              onMouseEnter={() => setHoverMedia(true)}
              onMouseLeave={() => setHoverMedia(false)}
            >
              <div className="absolute inset-0 flex items-center justify-center text-white/80">
                <div className="h-16 w-16">
                  <ProgramIcon id={activeRaw.id} />
                </div>
              </div>
              {/* Фото + видео-«оживление» по наведению (key → сброс при смене программы) */}
              <ProgramPhoto key={activeRaw.id} id={activeRaw.id} playing={hoverMedia} />
              <span className="absolute bottom-3 left-3 z-10 rounded-full bg-black/45 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur">
                {active.category}
              </span>
              {activeRaw.featured && (
                <span className="absolute left-3 top-3 z-10 inline-flex items-center gap-1.5 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-semibold text-[var(--primary)] shadow backdrop-blur">
                  <span className="text-[var(--accent)]">
                    <StarIcon />
                  </span>
                  {t('featured')}
                </span>
              )}
            </div>

            <div className="p-6">
              {activeRaw.indirectOnly && (
                <span className="mb-2 inline-flex w-fit rounded-full bg-[var(--accent-soft)] px-2.5 py-1 text-[11px] font-medium text-[var(--accent-2)]">
                  {t('indirectBadge')}
                </span>
              )}
              <h3 className="font-display text-2xl font-bold text-[var(--text)]">{active.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--text-2)]">{active.description}</p>

              {/* Ключевые условия */}
              <dl className="mt-5 grid grid-cols-3 gap-3 rounded-[var(--radius)] bg-[var(--surface-warm)] p-4">
                <div>
                  <dt className="text-xs text-[var(--text-3)]">{t('rate')}</dt>
                  <dd className="mt-0.5 text-sm font-bold text-[var(--text)]">
                    <RateDisplay program={activeRaw} />
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-[var(--text-3)]">{t('amountUpTo')}</dt>
                  <dd className="mt-0.5 text-sm font-bold text-[var(--text)]">
                    {fmtAmount(activeRaw.maxAmount)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-[var(--text-3)]">{t('termUpTo')}</dt>
                  <dd className="mt-0.5 text-sm font-bold text-[var(--text)]">
                    {formatTerm(activeRaw.maxTerm, t)}
                  </dd>
                </div>
              </dl>

              {/* CTA */}
              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => applyDirect(activeRaw.id)}
                  className="inline-flex h-12 items-center justify-center rounded-[var(--radius)] bg-[var(--primary)] px-6 font-semibold text-white transition hover:bg-[var(--primary-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2"
                >
                  {t('applyCta')}
                </button>
                <Link
                  href={`/${locale}/products/${activeRaw.id}`}
                  className="inline-flex h-12 items-center justify-center rounded-[var(--radius)] border border-[var(--border-strong)] bg-[var(--surface)] px-6 font-semibold text-[var(--primary)] transition hover:border-[var(--primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2"
                >
                  {t('detailsCta')}
                </Link>
              </div>
            </div>
          </div>

          {/* ПРАВО: отдельный блок калькулятора активной программы.
              flex-col + fill → калькулятор тянется на высоту блока, график у низа. */}
          <div className="flex flex-col rounded-[var(--radius-lg)] border border-[var(--primary)] bg-[var(--surface)] p-6 shadow-[var(--shadow)]">
            <h3 className="font-display text-xl font-bold text-[var(--text)]">{t('calcTitle')}</h3>
            <Calculator program={activeRaw} collapsibleSchedule fill />
          </div>
        </div>
      </div>
    </section>
  );
}
