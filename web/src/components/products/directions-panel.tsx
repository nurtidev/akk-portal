'use client';

// =====================================================
// DirectionsPanel — вкладка «Направления» программы «Агробизнес».
// Витрина 13 направлений «коробочного решения», сгруппированных в 4 кластера
// (Животноводство / Растениеводство / Хранение / Переработка). Клик по
// направлению открывает модалку со своими под-вкладками: Калькулятор
// (расчёт суммы инвестиций по нормативам) и Требования (специфичные для
// направления). Данные — из @/data/directions (перенос из xlsm «Коробочное
// решение»). Калькулятор — публичный pre-screen: ставка 6%, срок 10 лет.
// =====================================================

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  DIRECTIONS,
  DIRECTION_GROUPS,
  DIRECTIONS_TERMS,
  getDirectionsByGroup,
  type Direction,
  type CostItem,
} from '@/data/directions';
import { calculateSchedule } from '@/lib/schedule';
import type { Program } from '@/data/programs';
import {
  Beef, Sprout, Warehouse, Factory, Milk, Bird, Droplets, Apple, Leaf, Wheat, Fuel,
  type LucideIcon,
} from 'lucide-react';

// Иконки направлений — Lucide (дизайн-код: без эмодзи). `icon` в @/data/directions
// хранит имя Lucide-иконки; здесь маппим имя → компонент.
const DIR_ICONS: Record<string, LucideIcon> = {
  Beef, Sprout, Warehouse, Factory, Milk, Bird, Droplets, Apple, Leaf, Wheat, Fuel,
};
function DirIcon({ name, className }: { name: string; className?: string }) {
  const Icon = DIR_ICONS[name] ?? Sprout;
  return <Icon className={className} aria-hidden="true" />;
}

/** Полное число с разделителями групп («476 257 000»). */
function fmtNum(v: number): string {
  return String(Math.round(v || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

/** Вклад статьи затрат в сумму инвестиций при заданной мощности. */
function itemAmount(item: CostItem, capacity: number): number | null {
  if (typeof item.fixed === 'number') return item.fixed;
  if (item.perUnit != null) return item.perUnit * capacity;
  return null; // рассчитывается по проекту
}

export function DirectionsPanel({ program }: { program: Program }) {
  const t = useTranslations('content.products.directions');
  const [openId, setOpenId] = useState<string | null>(null);
  const current = openId ? DIRECTIONS.find((d) => d.id === openId) ?? null : null;

  return (
    <div>
      <p className="mb-2 max-w-2xl text-[15px] leading-relaxed text-[var(--text-2)]">{t('lead')}</p>

      {DIRECTION_GROUPS.map((g) => {
        const dirs = getDirectionsByGroup(g.key);
        return (
          <section key={g.key} className="mt-8">
            <div className="mb-4 flex items-center gap-3">
              <span
                aria-hidden="true"
                className="grid h-10 w-10 place-items-center rounded-[var(--radius)] bg-[var(--primary-soft)]"
              >
                <DirIcon name={g.icon} className="h-5 w-5 text-[var(--primary)]" />
              </span>
              <div>
                <h3 className="font-display text-base font-bold text-[var(--text)]">{g.title}</h3>
                <p className="text-xs text-[var(--text-3)]">
                  {t('count', { n: dirs.length })}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
              {dirs.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setOpenId(d.id)}
                  className="group flex flex-col rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-4 text-left shadow-[var(--shadow-sm)] transition hover:-translate-y-0.5 hover:border-[var(--primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
                >
                  <span className="font-display text-[15px] font-bold text-[var(--text)]">{d.title}</span>
                  <span className="mt-1 text-xs text-[var(--text-3)]">
                    {d.minCapacity ?? d.capacityLabel}
                  </span>
                  <span className="mt-3 inline-flex items-center gap-1 text-[13px] font-semibold text-[var(--accent)]">
                    {t('open')}
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                      <path d="M9 18l6-6-6-6" />
                    </svg>
                  </span>
                </button>
              ))}
            </div>
          </section>
        );
      })}

      {current && (
        <DirectionModal direction={current} program={program} onClose={() => setOpenId(null)} />
      )}
    </div>
  );
}

// --- Модалка направления (уровень 3) ---
function DirectionModal({
  direction,
  program,
  onClose,
}: {
  direction: Direction;
  program: Program;
  onClose: () => void;
}) {
  const t = useTranslations('content.products.directions');
  // Требования — первыми (фермеру важнее понять условия допуска), калькулятор — вторым.
  const [tab, setTab] = useState<'calc' | 'req'>('req');
  // Ставка — из самой программы (Агробизнес / Агробизнес 2.0); срок и каникулы —
  // из «коробочного» файла (DIRECTIONS_TERMS).
  const rateDisplay = program.rateRange ?? `${String(program.rate).replace('.', ',')}%`;

  // Esc + блокировка прокрутки фона, пока модалка открыта
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 backdrop-blur-sm sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={direction.title}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="my-4 w-full max-w-2xl overflow-hidden rounded-[var(--radius-lg)] bg-[var(--bg)] shadow-2xl">
        {/* Шапка */}
        <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-[var(--border)] bg-[var(--surface)] px-5 py-4">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-[var(--text-3)]">{t('breadcrumb')}</p>
            <h3 className="truncate font-display text-lg font-bold text-[var(--text)]">{direction.title}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('close')}
            className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] text-[var(--text-2)] transition hover:bg-[var(--bg-tint)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Параметры направления — читаемый блок «метка + значение»,
            как в «Условиях» программы (льготный период разложен на 2 части). */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 border-b border-[var(--border)] bg-[var(--surface-warm)] px-5 py-4 sm:grid-cols-4">
          <ParamCell label={t('termsRateLabel')} value={rateDisplay} />
          <ParamCell label={t('termsTermLabel')} value={t('termsTermValue', { years: DIRECTIONS_TERMS.termYears })} />
          <ParamCell label={t('termsGracePLabel')} value={t('termsGracePValue', { gp: DIRECTIONS_TERMS.gracePrincipalYears })} />
          <ParamCell label={t('termsGraceILabel')} value={t('termsGraceIValue', { gi: DIRECTIONS_TERMS.graceInterestYears })} />
        </div>

        {/* Под-вкладки: Требования первыми, затем Калькулятор (если есть данные) */}
        <div className="flex gap-1 border-b border-[var(--border)] px-5">
          <SubTab active={tab === 'req'} onClick={() => setTab('req')}>
            {t('reqTab')}
          </SubTab>
          {direction.dataStatus === 'full' && (
            <SubTab active={tab === 'calc'} onClick={() => setTab('calc')}>
              {t('calcTab')}
            </SubTab>
          )}
        </div>

        <div className="px-5 py-5">
          {tab === 'calc' && direction.dataStatus === 'full' ? (
            <DirectionCalculator direction={direction} program={program} />
          ) : (
            <DirectionRequirements direction={direction} />
          )}
        </div>
      </div>
    </div>
  );
}

// Плитка «метка + крупное значение» (как в ParamStrip «Условий» программы).
function ParamCell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-[var(--text-3)]">{label}</div>
      <div className="mt-0.5 font-display text-base font-bold leading-tight text-[var(--primary)] sm:text-lg">
        {value}
      </div>
    </div>
  );
}

function SubTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`border-b-2 px-3.5 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] ${
        active
          ? 'border-[var(--primary)] text-[var(--primary)]'
          : 'border-transparent text-[var(--text-3)] hover:text-[var(--text)]'
      }`}
    >
      {children}
    </button>
  );
}

// --- Калькулятор направления ---
function DirectionCalculator({ direction, program }: { direction: Direction; program: Program }) {
  const t = useTranslations('content.products.directions');
  const [capacity, setCapacity] = useState<number>(0);

  const rows = direction.costItems.map((it) => ({ item: it, amount: itemAmount(it, capacity) }));
  const total = rows.reduce((s, r) => s + (r.amount ?? 0), 0);

  // Ориентир платежа: та же «золотая» annual-логика. Ставка — из самой
  // программы (program.rate), срок — 10 лет из «коробочного» файла.
  const schedProgram: Program = {
    ...program,
    scheduleType: 'annual',
    maxTerm: DIRECTIONS_TERMS.termYears * 12,
  };
  const sched = total > 0 ? calculateSchedule(schedProgram, total, DIRECTIONS_TERMS.termYears * 12) : null;
  const annual = sched && sched.type === 'annual' ? sched.avgPayment : 0;

  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-[var(--text)]">
        {direction.capacityLabel}
      </label>
      <div className="flex items-center gap-2 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 focus-within:border-[var(--primary)]">
        <input
          type="text"
          inputMode="numeric"
          value={capacity ? fmtNum(capacity) : ''}
          onChange={(e) => {
            const n = Number((e.target.value.match(/\d/g) || []).join('')) || 0;
            setCapacity(n);
          }}
          placeholder="0"
          className="w-full bg-transparent text-base font-semibold text-[var(--text)] outline-none"
        />
        <span className="flex-shrink-0 text-sm font-medium text-[var(--text-3)]">{direction.capacityUnit}</span>
      </div>
      {direction.minCapacity && (
        <p className="mt-1.5 text-xs text-[var(--text-3)]">
          {t('minLabel')} {direction.minCapacity}
        </p>
      )}

      {/* Результат */}
      <div className="mt-5 rounded-[var(--radius)] bg-[var(--primary-soft)] p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--primary)]">
          {t('investTotal')}
        </p>
        <p className="mt-0.5 font-display text-2xl font-extrabold text-[var(--primary)]">
          {fmtNum(total)} ₸
        </p>
        {annual > 0 && (
          <div className="mt-3 flex items-center justify-between border-t border-dashed border-[var(--primary)]/30 pt-2.5 text-sm text-[var(--text-2)]">
            <span>{t('annualPayment')}</span>
            <b className="font-semibold text-[var(--text)]">~ {fmtNum(annual)} ₸</b>
          </div>
        )}
      </div>

      {/* Структура финансирования */}
      <div className="mt-4">
        <p className="mb-1.5 text-xs font-semibold text-[var(--text-3)]">{t('structureTitle')}</p>
        <div className="divide-y divide-[var(--border-soft)]">
          {rows.map((r) => (
            <div key={r.item.key} className="flex items-start justify-between gap-3 py-2 text-[13px]">
              <span className="text-[var(--text-2)]">
                {r.item.label}
                {r.item.optional && <span className="text-[var(--text-3)]"> · опционально</span>}
              </span>
              <b className="flex-shrink-0 font-semibold text-[var(--text)]">
                {r.amount == null ? t('byProject') : `${fmtNum(r.amount)} ₸`}
              </b>
            </div>
          ))}
        </div>
      </div>

      <button
        type="button"
        className="mt-5 w-full rounded-[var(--radius)] bg-[var(--primary)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--primary-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
      >
        {t('applyCta')}
      </button>
      <p className="mt-2.5 text-xs leading-relaxed text-[var(--text-3)]">{t('calcHint')}</p>
    </div>
  );
}

// --- Требования направления ---
function DirectionRequirements({ direction }: { direction: Direction }) {
  const t = useTranslations('content.products.directions');
  return (
    <div className="space-y-5">
      <p className="text-xs text-[var(--text-3)]">{t('reqNote')}</p>
      {direction.requirements.map((g) => (
        <div key={g.title}>
          <h4 className="mb-2.5 font-display text-[15px] font-semibold text-[var(--primary)]">{g.title}</h4>
          <ul className="space-y-2">
            {g.items.map((s, i) => (
              <li key={i} className="relative pl-5 text-[13px] leading-relaxed text-[var(--text-2)]">
                <span
                  aria-hidden="true"
                  className="absolute left-0.5 top-[7px] h-1.5 w-1.5 rounded-sm bg-[var(--accent)]"
                />
                {s}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
