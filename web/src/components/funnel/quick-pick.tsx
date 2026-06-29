'use client';

// =====================================================
// ===== Карточка «Быстрый подбор» в герое (yesoff-стиль)
// Правая колонка первого экрана: пользователь сразу выбирает цель и
// (опционально) сумму — кнопка запускает ту же воронку через startQuickPick
// (единый стор, без дублирования логики). Цель — обязательна, сумма — нет.
// Опции берём из квиза (единый источник правды), подписи — через l10n.
// =====================================================

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { QUESTIONS } from '@/data/questions';
import { useFunnel } from './funnel-context';
import { useQuestionL10n } from './use-question-l10n';

const purposeQuestion = QUESTIONS.find((q) => q.key === 'purpose');
const amountQuestion = QUESTIONS.find((q) => q.key === 'amount');

function Chevron() {
  return (
    <svg
      className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-3)]"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

export function QuickPick() {
  const t = useTranslations('funnel.quickPick');
  const qt = useQuestionL10n();
  const { startQuickPick } = useFunnel();
  const [purpose, setPurpose] = useState('');
  const [amount, setAmount] = useState('');

  const selectClass =
    'h-12 w-full appearance-none rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] pl-3.5 pr-9 text-sm font-medium text-[var(--text)] shadow-[var(--shadow-sm)] transition focus-visible:border-[var(--primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] disabled:opacity-60';

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!purpose) return;
    startQuickPick(purpose, amount || undefined);
  };

  return (
    <form
      onSubmit={onSubmit}
      className="w-full rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-lg)] md:p-6"
      aria-label={t('title')}
    >
      <h2 className="font-display text-lg font-bold text-[var(--text)] md:text-xl">{t('title')}</h2>
      <p className="mt-1 text-xs text-[var(--text-3)]">{t('hint')}</p>

      <div className="mt-4 space-y-3">
        {/* Цель — обязательна */}
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-[var(--text-2)]">
            {t('purposeLabel')}
          </span>
          <span className="relative block">
            <select
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              className={selectClass}
              required
            >
              <option value="" disabled>
                {t('purposePlaceholder')}
              </option>
              {(purposeQuestion?.options ?? []).map((o) => (
                <option key={o.value} value={o.value}>
                  {purposeQuestion ? qt.optLabel(purposeQuestion, o.value) : o.label}
                </option>
              ))}
            </select>
            <Chevron />
          </span>
        </label>

        {/* Сумма — опциональна */}
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-[var(--text-2)]">
            {t('amountLabel')}
          </span>
          <span className="relative block">
            <select
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className={selectClass}
            >
              <option value="">{t('amountPlaceholder')}</option>
              {(amountQuestion?.options ?? []).map((o) => (
                <option key={o.value} value={o.value}>
                  {amountQuestion ? qt.optLabel(amountQuestion, o.value) : o.label}
                </option>
              ))}
            </select>
            <Chevron />
          </span>
        </label>
      </div>

      <button
        type="submit"
        disabled={!purpose}
        className="mt-5 inline-flex h-[52px] w-full items-center justify-center gap-2 rounded-[var(--radius)] bg-[var(--primary)] px-6 text-base font-semibold text-white shadow-[var(--shadow-sm)] transition hover:bg-[var(--primary-2)] hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {t('submit')}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <path d="M5 12h14M12 5l7 7-7 7" />
        </svg>
      </button>
    </form>
  );
}
