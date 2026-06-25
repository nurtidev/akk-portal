'use client';

// =====================================================
// ProductCalculator — standalone-калькулятор платежа на странице продукта.
// Та же золотая логика, что и в воронке (@/lib/schedule), но на локальном
// стейте, без FunnelProvider (страница продукта вне воронки). Подписи —
// из i18n funnel.calc (переиспользуем). Срок без ответов квиза = p.maxTerm.
// Калькулятор — публичный pre-screen (ориентировочный расчёт).
// =====================================================

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import type { Program } from '@/data/programs';
import { calculateSchedule, pickInitialTerm } from '@/lib/schedule';
import { fmtAmount, declension } from '@/lib/format';

const TERM_OPTIONS = [12, 24, 36, 48, 60, 84, 120, 144, 180];

/** Полное число с разделителями групп («20 000 000»). */
function fmtNum(v: number): string {
  return String(Math.round(v || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

export function ProductCalculator({ program }: { program: Program }) {
  const t = useTranslations('funnel.calc');
  const p = program;
  const effMax = p.maxTerm; // вне воронки нет цели квиза → полный потолок
  const isBi = p.scheduleType === 'biannual_winter';

  const [amount, setAmount] = useState(
    Math.min(Math.max(Math.round(p.maxAmount / 2), 100000), p.maxAmount),
  );
  const [term, setTerm] = useState(isBi ? effMax : pickInitialTerm(effMax));

  const sch = calculateSchedule(p, amount, isBi ? effMax : term);
  const terms = TERM_OPTIONS.filter((x) => x <= effMax);
  const step = Math.max(Math.round(p.maxAmount / 100), 10000);

  const onManual = (raw: string) => {
    let n = Number((raw.match(/\d/g) || []).join('')) || 0;
    if (n > p.maxAmount) n = p.maxAmount;
    setAmount(n);
  };
  const onManualBlur = () => {
    if (amount < 100000) setAmount(100000);
  };

  return (
    <div>
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
            value={fmtNum(amount)}
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
          value={Math.max(amount, 100000)}
          onChange={(e) => setAmount(Number(e.target.value))}
          aria-label={t('amountAria')}
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
                onClick={() => setTerm(x)}
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

      {/* График погашения */}
      <div className="mt-5">
        {sch.type === 'biannual' ? (
          <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface-warm)] p-4">
            <div className="mb-3 text-sm font-semibold text-[var(--text)]">{t('biTitle')}</div>
            {sch.payments.map((pp, i) => (
              <div
                key={i}
                className="flex items-start justify-between border-b border-[var(--border-soft)] py-2 last:border-0"
              >
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
            ))}
            <div className="flex items-center justify-between pt-2">
              <div className="text-sm text-[var(--text-2)]">{t('overpay')}</div>
              <div className="text-sm font-bold text-[var(--text)]">
                {fmtAmount(Math.round(sch.overpay))}
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface-warm)] p-4">
            <div className="mb-3 text-sm font-semibold text-[var(--text)]">
              {t('annualTitle', {
                years: sch.years,
                word: declension(sch.years, t('yearOne'), t('yearFew'), t('yearMany')),
              })}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-[var(--text-3)]">{t('firstYearPayment')}</div>
                <div className="mt-0.5 text-base font-bold text-[var(--text)]">
                  {fmtAmount(Math.round(sch.firstYearPayment))}
                </div>
                <div className="text-xs text-[var(--text-3)]">
                  {t('lastYear', { v: fmtAmount(Math.round(sch.lastYearPayment)) })}
                </div>
              </div>
              <div>
                <div className="text-xs text-[var(--text-3)]">{t('overpay')}</div>
                <div className="mt-0.5 text-base font-bold text-[var(--text)]">
                  {fmtAmount(Math.round(sch.overpay))}
                </div>
                <div className="text-xs text-[var(--text-3)]">
                  {t('forYears', {
                    years: sch.years,
                    word: declension(sch.years, t('yearOne'), t('yearFew'), t('yearMany')),
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
