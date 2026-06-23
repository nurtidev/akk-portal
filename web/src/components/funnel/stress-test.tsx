'use client';

// =====================================================
// ===== B5: StressTest (Fajr-lite) ====================
// renderStress/renderStressResult из легаси (≈ 3970–4097), UI-часть.
// Форма + вердикт-пилюля (ok/warn/bad) + разбор метрик. Только для
// hasStressTest-программ; кнопка «Пропустить и подать заявку».
// Расчёт — @/lib/stress (НЕ переписываем).
// =====================================================

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { PROGRAMS } from '@/data/programs';
import { FAJR_NORMS, type AnimalType } from '@/data/fajr-norms';
import { fmtAmount } from '@/lib/format';
import type { StressState } from './funnel-state';
import { useFunnel } from './funnel-context';
import { useProgramL10n } from './use-program-l10n';

const NUMERIC_FIELDS: Array<{
  field: keyof StressState;
  labelKey: string;
  hintKey: string;
  placeholder: string;
  step?: string;
}> = [
  { field: 'existingHerd', labelKey: 'existingHerd', hintKey: 'existingHerdHint', placeholder: '50' },
  { field: 'plannedHerd', labelKey: 'plannedHerd', hintKey: 'plannedHerdHint', placeholder: '200' },
  { field: 'pasturesHa', labelKey: 'pasturesHa', hintKey: 'pasturesHaHint', placeholder: '300' },
  { field: 'barnSqm', labelKey: 'barnSqm', hintKey: 'barnSqmHint', placeholder: '1500' },
  { field: 'existingDebtsMonthly', labelKey: 'existingDebts', hintKey: 'existingDebtsHint', placeholder: '150' },
  { field: 'annualRevenue', labelKey: 'annualRevenue', hintKey: 'annualRevenueHint', placeholder: '15', step: '0.1' },
];

const VERDICT_STYLES: Record<string, string> = {
  ok: 'border-[var(--success)] bg-[var(--success-soft)] text-[var(--success)]',
  warn: 'border-[var(--warning)] bg-[var(--warning-soft)] text-[var(--warning)]',
  bad: 'border-[var(--danger)] bg-[var(--danger-soft)] text-[var(--danger)]',
};

export function StressTest() {
  const t = useTranslations('funnel.stress');
  const { state, setStressField, runStress, skipStress } = useFunnel();
  const lp = useProgramL10n();
  const [herdError, setHerdError] = useState('');
  const p = PROGRAMS.find((x) => x.id === state.selectedProgram);
  if (!p) return null;

  const r = state.stress.result;

  // Пустая форма раньше «считалась» по нулям и пугала красным вердиктом (ratio 999%).
  // Без поголовья расчёт не имеет смысла — просим заполнить, а не пугаем.
  const onCalc = () => {
    const total =
      (Number(state.stress.existingHerd) || 0) + (Number(state.stress.plannedHerd) || 0);
    if (total <= 0) {
      setHerdError(t('errNoHerd'));
      return;
    }
    setHerdError('');
    runStress();
  };

  return (
    <div className="mx-auto max-w-2xl">
      <span className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-[var(--accent-2)]">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
          <path d="M9 11l3 3L22 4" />
          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
        </svg>
        {t('eyebrow')}
      </span>
      <h2 className="mt-2 font-display text-2xl font-bold text-[var(--text)] md:text-3xl">{t('title')}</h2>
      <p className="mt-2 text-sm leading-relaxed text-[var(--text-2)]">{t('sub')}</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {/* Вид животных */}
        <div className="sm:col-span-2">
          <label className="mb-1.5 block text-sm font-medium text-[var(--text)]">{t('animalLabel')}</label>
          <select
            value={state.stress.animalType}
            onChange={(e) => setStressField('animalType', e.target.value)}
            className="w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-[var(--text)] outline-none focus:border-[var(--primary)]"
          >
            {(Object.keys(FAJR_NORMS) as AnimalType[]).map((k) => (
              <option key={k} value={k}>
                {FAJR_NORMS[k].label}
              </option>
            ))}
          </select>
          <div className="mt-1 text-xs text-[var(--text-3)]">{t('animalHint')}</div>
        </div>

        {NUMERIC_FIELDS.map((f) => (
          <div key={f.field}>
            <label className="mb-1.5 block text-sm font-medium text-[var(--text)]">
              {t(f.labelKey)}
            </label>
            <input
              type="number"
              min={0}
              step={f.step}
              placeholder={t('placeholderEg', { v: f.placeholder })}
              value={state.stress[f.field] as string}
              onChange={(e) => setStressField(f.field, e.target.value)}
              className="w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-[var(--text)] outline-none focus:border-[var(--primary)]"
            />
            <div className="mt-1 text-xs text-[var(--text-3)]">
              {f.field === 'plannedHerd' ? t('plannedHerdHint', { title: lp.title(p.id, p.title) }) : t(f.hintKey)}
            </div>
          </div>
        ))}
      </div>

      {/* Результат */}
      {r && (
        <div className="mt-6">
          <div className={`flex items-start gap-3 rounded-[var(--radius)] border px-4 py-3 ${VERDICT_STYLES[r.verdict.level]}`}>
            <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-white/40 text-base font-bold">
              {r.verdict.icon}
            </span>
            <div>
              <div className="font-semibold">{r.verdict.title}</div>
              <div className="mt-0.5 text-sm leading-relaxed opacity-90">{r.verdict.text}</div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-3">
            <Metric
              label={t('netIncome')}
              sub={r.animalLabel}
              value={fmtAmount(Math.round(r.netIncome)) + t('perYear')}
            />
            <Metric
              label={r.existingDebtsYearly > 0 ? t('totalPayment') : t('newPayment')}
              sub={
                r.existingDebtsYearly > 0
                  ? t('includingExisting', { v: fmtAmount(Math.round(r.existingDebtsYearly)) })
                  : undefined
              }
              value={fmtAmount(Math.round(r.existingDebtsYearly > 0 ? r.totalYearlyPayment : r.yearlyPayment))}
            />
            <Metric label={t('paymentOfIncome')} value={r.ratio < 999 ? Math.round(r.ratio) + '%' : '—'} />
          </div>
        </div>
      )}

      <div className="mt-6 flex flex-wrap gap-3">
        {herdError && (
          <div className="w-full text-sm font-medium text-[var(--danger)]">{herdError}</div>
        )}
        <button
          type="button"
          onClick={onCalc}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-[var(--radius)] bg-[var(--primary)] px-6 font-semibold text-white transition hover:bg-[var(--primary-2)]"
        >
          {r ? t('recalc') : t('calc')}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </button>
        <button
          type="button"
          onClick={skipStress}
          className="inline-flex h-12 items-center justify-center rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-6 font-semibold text-[var(--text-2)] transition hover:border-[var(--primary)]"
        >
          {t('skip')}
        </button>
      </div>

      <p className="mt-6 text-xs leading-relaxed text-[var(--text-3)]">{t('disclaimer')}</p>
    </div>
  );
}

function Metric({ label, sub, value }: { label: string; sub?: string; value: string }) {
  return (
    <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface-warm)] p-3">
      <div className="text-xs text-[var(--text-2)]">
        {label}
        {sub && <div className="mt-0.5 text-[11px] text-[var(--text-3)]">{sub}</div>}
      </div>
      <div className="mt-1 text-sm font-bold text-[var(--text)]">{value}</div>
    </div>
  );
}
