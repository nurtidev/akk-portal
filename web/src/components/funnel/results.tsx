'use client';

// =====================================================
// ===== B3: Results (карточки по scoredPrograms) ======
// renderResults/renderResultCard из легаси (≈ 3572–3738):
//  - карточки отсортированы по совпадению; топ — «Лучшее совпадение»;
//  - раскрывашка «Почему N%» (explainProgram);
//  - rateNote с глоссарием, статы, встроенный калькулятор, scheduleNote;
//  - CTA «Подать заявку →». Пустое состояние — консультация менеджера.
// =====================================================

import { useTranslations } from 'next-intl';
import type { Program } from '@/data/programs';
import { scoredPrograms, explainProgram } from '@/lib/scoring';
import { effectiveMaxTerm } from '@/lib/schedule';
import { fmtAmount, declension } from '@/lib/format';
import { useFunnel } from './funnel-context';
import { RateDisplay } from './rate-display';
import { applyGlossary } from './glossary';
import { WhyMatch } from './why-match';
import { Calculator } from './calculator';

function ResultCard({ program, score, isTop }: { program: Program; score: number; isTop: boolean }) {
  const t = useTranslations('funnel.results');
  const { state, apply } = useFunnel();
  const p = program;
  const effMax = effectiveMaxTerm(p, state.answers);
  const explain = explainProgram(p, state.answers);
  const matchHi = score >= 70;

  return (
    <div
      className={`overflow-hidden rounded-[var(--radius-lg)] border bg-[var(--surface)] ${
        isTop ? 'border-[var(--primary)] ring-1 ring-[var(--primary)]' : 'border-[var(--border)]'
      }`}
    >
      {/* Баннер: фото-фон, категория и % совпадения */}
      <div className="relative flex items-center justify-between bg-gradient-to-br from-[var(--primary)] to-[var(--primary-2)] px-5 py-3 text-white">
        {isTop && (
          <span className="absolute -top-0 left-0 rounded-br-[var(--radius)] bg-[var(--accent)] px-3 py-1 text-[11px] font-bold text-[var(--text)]">
            {t('bestMatch')}
          </span>
        )}
        <span className="ml-auto text-xs font-medium opacity-90">{p.category}</span>
        <span
          className={`ml-3 rounded-full px-3 py-1 text-sm font-bold ${
            matchHi ? 'bg-white text-[var(--primary)]' : 'bg-white/20 text-white'
          }`}
        >
          {t('matchPct', { score })}
        </span>
      </div>

      <div className="p-5">
        <h3 className="font-display text-xl font-bold text-[var(--text)]">{p.title}</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-[var(--text-2)]">{p.description}</p>

        <WhyMatch explain={explain} score={score} />

        {p.rateNote && (
          <div className="mt-3 rounded-[var(--radius)] bg-[var(--surface-warm)] px-4 py-3 text-sm leading-relaxed text-[var(--text-2)]">
            {applyGlossary(p.rateNote)}
          </div>
        )}

        <div className="mt-4 grid grid-cols-3 gap-3 rounded-[var(--radius)] bg-[var(--bg-tint)] p-3 text-center">
          <div>
            <div className="text-[11px] uppercase text-[var(--text-3)]">{t('rate')}</div>
            <div className="mt-0.5 text-sm font-bold text-[var(--text)]">
              <RateDisplay program={p} />
            </div>
          </div>
          <div>
            <div className="text-[11px] uppercase text-[var(--text-3)]">{t('amountUpTo')}</div>
            <div className="mt-0.5 text-sm font-bold text-[var(--text)]">{fmtAmount(p.maxAmount)}</div>
          </div>
          <div>
            <div className="text-[11px] uppercase text-[var(--text-3)]">{t('termUpTo')}</div>
            <div className="mt-0.5 text-sm font-bold text-[var(--text)]">
              {effMax} {t('mo')}
            </div>
          </div>
        </div>

        {/* B4 калькулятор встроен в карточку */}
        <Calculator program={p} />

        {p.scheduleNote && (
          <div className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-[var(--text-3)]">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="mt-0.5 flex-none">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            <span>{applyGlossary(p.scheduleNote)}</span>
          </div>
        )}

        <div className="mt-5 flex items-center justify-between gap-3">
          <span className="text-xs text-[var(--text-3)]">{p.org}</span>
          <button
            type="button"
            onClick={() => apply(p.id)}
            className="inline-flex h-11 items-center justify-center rounded-[var(--radius)] bg-[var(--primary)] px-5 font-semibold text-white transition hover:bg-[var(--primary-2)]"
          >
            {t('applyCta')}
          </button>
        </div>
      </div>
    </div>
  );
}

export function Results() {
  const t = useTranslations('funnel.results');
  const { state, startQuiz, requestConsultation } = useFunnel();
  const scored = scoredPrograms(state.answers);

  if (scored.length === 0) {
    return (
      <div className="mx-auto max-w-2xl text-center">
        <div className="mb-2 text-sm font-semibold uppercase tracking-wide text-[var(--accent-2)]">
          {t('eyebrow')}
        </div>
        <h2 className="font-display text-3xl font-bold text-[var(--text)]">{t('emptyTitle')}</h2>
        <p className="mt-3 text-[var(--text-2)]">{t('emptyLede')}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={requestConsultation}
            className="inline-flex h-12 items-center justify-center rounded-[var(--radius)] bg-[var(--primary)] px-6 font-semibold text-white transition hover:bg-[var(--primary-2)]"
          >
            {t('emptyConsult')}
          </button>
          <button
            type="button"
            onClick={startQuiz}
            className="inline-flex h-12 items-center justify-center rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-6 font-semibold text-[var(--text-2)] transition hover:border-[var(--primary)]"
          >
            {t('editAnswers')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-2 text-sm font-semibold uppercase tracking-wide text-[var(--accent-2)]">
            {t('eyebrow')}
          </div>
          <h2 className="font-display text-2xl font-bold text-[var(--text)] md:text-3xl">
            {t('foundTitle', {
              count: scored.length,
              word: declension(scored.length, t('programOne'), t('programFew'), t('programMany')),
            })}
          </h2>
          <p className="mt-2 text-[var(--text-2)]">{t('foundLede')}</p>
        </div>
        <button
          type="button"
          onClick={startQuiz}
          className="text-sm font-medium text-[var(--text-2)] transition hover:text-[var(--primary)]"
        >
          {t('editAnswersShort')}
        </button>
      </div>

      <div className="space-y-6">
        {scored.map((x, i) => (
          <ResultCard key={x.program.id} program={x.program} score={x.score} isTop={i === 0} />
        ))}
      </div>
    </div>
  );
}
