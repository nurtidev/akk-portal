'use client';

// =====================================================
// ===== B2: Quiz (шаги, прогресс, условные вопросы) ===
// renderQuiz из легаси (≈ 3471–3555): прогресс-бар по реальному числу шагов
// (5/6/7), переход по пройденным, кнопка «Назад», задержка ~180мс после выбора.
// Условные вопросы — через getQuestions(answers).
// =====================================================

import { useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { getQuestions } from '@/data/questions';
import { useFunnel } from './funnel-context';

export function Quiz() {
  const t = useTranslations('funnel.quiz');
  const { state, answer, goToStep, setStep, prevStep, showResults, maxReachableStep } = useFunnel();
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const qs = getQuestions(state.answers);
  const step = state.step;

  // Если шаг вышел за пределы (последний вопрос отвечён) — к результатам.
  useEffect(() => {
    if (step >= qs.length) {
      showResults();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, qs.length]);

  // Таймер автоперехода гасим ТОЛЬКО при размонтировании.
  // Нельзя в cleanup эффекта выше: ответ меняет qs.length (условные ветки),
  // эффект перезапускается и cleanup убивал ещё не сработавший переход.
  useEffect(() => {
    return () => {
      if (advanceTimer.current) clearTimeout(advanceTimer.current);
    };
  }, []);

  if (step >= qs.length) return null;

  const q = qs[step];
  const reachable = maxReachableStep();

  const onSelect = (value: string) => {
    answer(q.key, value);
    // Задержка перед переходом — как в легаси (даём увидеть выбор).
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    advanceTimer.current = setTimeout(() => {
      const next = step + 1;
      // Пересчитываем список вопросов с учётом нового ответа (условные ветки).
      const after = getQuestions({ ...state.answers, [q.key]: value });
      if (next >= after.length) {
        showResults();
      } else {
        setStep(next); // тихий автопереход — событие quiz_answer уже отправлено
      }
    }, 180);
  };

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-3 text-sm font-medium text-[var(--text-3)]">
        {t('stepLabel', { current: step + 1, total: qs.length })}
      </div>

      {/* Прогресс-степпер: пройденные кликабельны */}
      <div className="mb-8 flex flex-wrap gap-2" role="tablist" aria-label={t('progressAria')}>
        {qs.map((question, i) => {
          const answered = state.answers[question.key] != null;
          const isCurrent = i === step;
          const canGoto = i <= reachable && !isCurrent;
          let cls =
            'flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition ';
          if (isCurrent) {
            cls += 'border-[var(--primary)] bg-[var(--primary)] text-white';
          } else if (answered) {
            cls += 'border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary)]';
          } else if (i <= reachable) {
            cls += 'border-[var(--border)] bg-[var(--surface)] text-[var(--text-2)]';
          } else {
            cls += 'border-[var(--border-soft)] bg-[var(--bg-tint)] text-[var(--text-3)] opacity-60';
          }
          return (
            <button
              key={question.key}
              type="button"
              disabled={!canGoto}
              onClick={() => canGoto && goToStep(i)}
              // aria-label разводит accessible name чипа с кнопками-вариантами ответа
              // (например, чип «Импорт» и вариант «Импортное племенное поголовье»)
              aria-label={`${t('stepLabel', { current: i + 1, total: qs.length })}: ${question.short}`}
              className={cls + (canGoto ? ' cursor-pointer hover:opacity-90' : '')}
            >
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-black/10 text-[11px] font-bold">
                {answered && !isCurrent ? '✓' : i + 1}
              </span>
              <span>{question.short}</span>
            </button>
          );
        })}
      </div>

      <h2 className="font-display text-2xl font-bold text-[var(--text)] md:text-3xl">{q.title}</h2>
      {q.hint && <p className="mt-2 text-sm text-[var(--text-2)]">{q.hint}</p>}

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {q.options.map((o) => {
          const selected = state.answers[q.key] === o.value;
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => onSelect(o.value)}
              className={`rounded-[var(--radius)] border p-4 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--primary)] ${
                selected
                  ? 'border-[var(--primary)] bg-[var(--primary-soft)] ring-1 ring-[var(--primary)]'
                  : 'border-[var(--border)] bg-[var(--surface)] hover:border-[var(--primary)]'
              }`}
            >
              <div className="font-semibold text-[var(--text)]">{o.label}</div>
              {o.desc && <div className="mt-1 text-sm text-[var(--text-2)]">{o.desc}</div>}
            </button>
          );
        })}
      </div>

      {step > 0 && (
        <button
          type="button"
          onClick={prevStep}
          className="mt-6 text-sm font-medium text-[var(--text-2)] transition hover:text-[var(--primary)]"
        >
          {t('back')}
        </button>
      )}
    </div>
  );
}
