'use client';

// =====================================================
// ===== B4: Calculator (слайдер + ввод + сроки + график)
// renderResultCard/updateCalc из легаси (≈ 3647–3856):
//  - стартовая сумма из ответа квиза (через ensureCalc в контексте);
//  - слайдер + ручной ввод суммы (зажим [100 000; maxAmount]);
//  - кнопки сроков ≤ effectiveMaxTerm (для biannual — срок фиксирован);
//  - таблица графика обеих схем (biannual / annual) + переплата.
// Расчёт — @/lib/schedule (НЕ переписываем).
// =====================================================

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import type { Program } from '@/data/programs';
import { calculateSchedule, effectiveMaxTerm, pickInitialTerm } from '@/lib/schedule';
import { fmtAmount, declension } from '@/lib/format';
import { useFunnel } from './funnel-context';

const TERM_OPTIONS = [12, 24, 36, 48, 60, 84, 120];

/** Полное число с разделителями групп («20 000 000») — fmtNum из легаси. */
function fmtNum(v: number): string {
  return String(Math.round(v || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

export function Calculator({
  program,
  collapsibleSchedule = false,
  fill = false,
}: {
  program: Program;
  /** Спрятать график погашения под раскрывашку (свёрнут по умолчанию, виден итог-переплата). */
  collapsibleSchedule?: boolean;
  /** Растянуть калькулятор на всю высоту контейнера, прижав график к низу (выравнивание высоты блоков). */
  fill?: boolean;
}) {
  const t = useTranslations('funnel.calc');
  const { state, calcEntry, seedCalc, setCalcAmount, commitCalcAmount, setCalcTerm } = useFunnel();

  const p = program;
  // Засеваем запись калькулятора в стор после монтирования (не в рендере).
  useEffect(() => {
    seedCalc(p.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.id]);
  // Текущая запись (из стора или вычисленная по умолчанию) — чистое чтение.
  const c = calcEntry(p.id);
  const effMax = effectiveMaxTerm(p, state.answers);
  const isBi = p.scheduleType === 'biannual_winter';
  const term = c.term > effMax ? pickInitialTerm(effMax) : c.term;
  const sch = calculateSchedule(p, c.amount, term);
  const terms = TERM_OPTIONS.filter((x) => x <= effMax);

  const onSlider = (v: number) => setCalcAmount(p.id, v);

  const onManual = (raw: string) => {
    let n = Number((raw.match(/\d/g) || []).join('')) || 0;
    if (n > p.maxAmount) n = p.maxAmount;
    setCalcAmount(p.id, n);
  };

  const onManualBlur = () => {
    const amt = c.amount < 100000 ? 100000 : c.amount;
    if (c.amount < 100000) setCalcAmount(p.id, 100000);
    commitCalcAmount(p.id, amt); // событие calculator_amount при завершении ввода
  };

  const step = Math.max(Math.round(p.maxAmount / 100), 10000);

  // fill → растягиваем калькулятор по высоте, график «прижимаем» к низу (mt-auto),
  // чтобы лишняя высота ушла в отступ между блоком «Срок» и графиком.
  const scheduleMargin = fill ? 'mt-auto' : 'mt-5';

  return (
    <div className={fill ? 'flex h-full flex-1 flex-col' : undefined}>
      {/* Сумма */}
      <div className="mt-5">
        <div className="mb-1.5 flex items-center justify-between">
          <label className="text-sm font-medium text-[var(--text)]">{t('amountLabel')}</label>
          <span className="text-xs text-[var(--text-3)]">
            {t('maxHint', { max: fmtAmount(p.maxAmount) })}
          </span>
        </div>
        <div className="flex items-center gap-2 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 focus-within:border-[var(--primary)]">
          <input
            type="text"
            inputMode="numeric"
            value={fmtNum(c.amount)}
            onChange={(e) => onManual(e.target.value)}
            onBlur={onManualBlur}
            aria-label={t('amountAria')}
            className="w-full bg-transparent text-lg font-semibold text-[var(--text)] outline-none"
          />
          <span className="text-[var(--text-3)]">₸</span>
        </div>
        <input
          type="range"
          min={100000}
          max={p.maxAmount}
          step={step}
          value={Math.max(c.amount, 100000)}
          onChange={(e) => onSlider(Number(e.target.value))}
          onMouseUp={() => commitCalcAmount(p.id, c.amount)}
          onTouchEnd={() => commitCalcAmount(p.id, c.amount)}
          className="mt-3 w-full accent-[var(--primary)]"
        />
      </div>

      {/* Срок */}
      {isBi ? (
        <div className="mt-4 rounded-[var(--radius)] bg-[var(--surface-warm)] px-4 py-3 text-sm text-[var(--text-2)]">
          {t('termLocked')}
        </div>
      ) : (
        <div className="mt-4">
          <label className="mb-1.5 block text-sm font-medium text-[var(--text)]">
            {t('termLabel')}
          </label>
          <div className="flex flex-wrap gap-2">
            {terms.map((x) => (
              <button
                key={x}
                type="button"
                onClick={() => setCalcTerm(p.id, x)}
                className={`rounded-[var(--radius-sm)] border px-3 py-1.5 text-sm font-medium transition ${
                  x === term
                    ? 'border-[var(--primary)] bg-[var(--primary)] text-white'
                    : 'border-[var(--border)] bg-[var(--surface)] text-[var(--text-2)] hover:border-[var(--primary)]'
                }`}
              >
                {t('termMonths', { n: x })}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* График погашения. collapsibleSchedule → под раскрывашкой (в свёрнутом
          виде виден только итог-переплата), иначе блок раскрыт как раньше. */}
      {(() => {
        const title =
          sch.type === 'biannual'
            ? t('biTitle')
            : t('annualTitle', {
                years: sch.years,
                word: declension(sch.years, t('yearOne'), t('yearFew'), t('yearMany')),
              });

        const rows =
          sch.type === 'biannual' ? (
            sch.payments.map((pp, i) => (
              <div key={i} className="flex items-start justify-between border-b border-[var(--border-soft)] py-2 last:border-0">
                <div>
                  <div className="text-sm font-medium text-[var(--text)]">{pp.label}</div>
                  <div className="text-xs text-[var(--text-3)]">{pp.note}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-[var(--text)]">
                    {fmtAmount(Math.round(pp.amount))}
                  </div>
                  <div className="text-xs text-[var(--text-3)]">
                    {t('ofWhichInterest', { v: fmtAmount(Math.round(pp.interest)) })}
                  </div>
                </div>
              </div>
            ))
          ) : (
            sch.yearly.map((yr) => (
              <div
                key={yr.year}
                className="flex items-center justify-between border-b border-[var(--border-soft)] py-2 last:border-0"
              >
                <div className="text-sm font-medium text-[var(--text)]">
                  {t('yearRow', { n: yr.year })}
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-[var(--text)]">
                    {fmtAmount(Math.round(yr.payment))}
                  </div>
                  <div className="text-xs text-[var(--text-3)]">
                    {t('ofWhichInterest', { v: fmtAmount(Math.round(yr.interest)) })}
                  </div>
                </div>
              </div>
            ))
          );

        const overpayRow = (
          <div className="flex items-center justify-between pt-2">
            <div className="text-sm text-[var(--text-2)]">{t('overpay')}</div>
            <div className="text-sm font-bold text-[var(--text)]">
              {fmtAmount(Math.round(sch.overpay))}
            </div>
          </div>
        );

        if (collapsibleSchedule) {
          return (
            <details className={`group ${scheduleMargin} rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface-warm)]`}>
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4">
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-[var(--text)]">{title}</span>
                  <span className="block text-xs text-[var(--text-3)]">
                    {t('overpay')}: {fmtAmount(Math.round(sch.overpay))}
                  </span>
                </span>
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  aria-hidden="true"
                  className="flex-shrink-0 text-[var(--text-3)] transition-transform group-open:rotate-180"
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </summary>
              <div className="border-t border-[var(--border-soft)] px-4 pb-3 pt-1">
                {rows}
                {overpayRow}
              </div>
            </details>
          );
        }

        return (
          <div className={scheduleMargin}>
            <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface-warm)] p-4">
              <div className="mb-3 text-sm font-semibold text-[var(--text)]">{title}</div>
              {rows}
              {overpayRow}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
