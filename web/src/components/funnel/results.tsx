'use client';

// =====================================================
// ===== B3: Results (карточки по scoredPrograms) ======
// renderResults/renderResultCard из легаси (≈ 3572–3738):
//  - карточки отсортированы по совпадению; топ — «Лучшее совпадение»;
//  - раскрывашка «Почему N%» (explainProgram);
//  - rateNote с глоссарием, статы, встроенный калькулятор, scheduleNote;
//  - CTA «Подать заявку →». Пустое состояние — консультация менеджера.
// =====================================================

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import type { Program } from '@/data/programs';
import { scoredPrograms, explainProgram } from '@/lib/scoring';
import { effectiveMaxTerm } from '@/lib/schedule';
import { fmtAmount, declension } from '@/lib/format';
import { useFunnel } from './funnel-context';
import { RateDisplay } from './rate-display';
import { applyGlossary } from './glossary';
import { WhyMatch } from './why-match';
import { Calculator } from './calculator';
import { useProgramL10n } from './use-program-l10n';

function ResultCard({
  program,
  score,
  isTop,
  isLowestRate,
}: {
  program: Program;
  score: number;
  isTop: boolean;
  isLowestRate?: boolean;
}) {
  const t = useTranslations('funnel.results');
  const { state, apply } = useFunnel();
  const params = useParams<{ locale: string }>();
  const locale = params?.locale ?? 'ru';
  const [pdfLoading, setPdfLoading] = useState(false);
  const p = useProgramL10n().localize(program);

  const handleDownloadPdf = async () => {
    setPdfLoading(true);
    try {
      const [{ generateChecklistPdf }, { getChecklist }] = await Promise.all([
        import('@/lib/pdf-checklist'),
        import('@/data/loan-documents'),
      ]);
      await generateChecklistPdf({
        programId: p.id,
        programTitle: p.title,
        programCategory: p.category,
        rate: p.rate,
        rateRange: p.rateRange,
        maxAmount: p.maxAmount,
        maxTerm: p.maxTerm,
        checklist: getChecklist(p.id),
        locale: locale === 'kk' ? 'kk' : locale === 'en' ? 'en' : 'ru',
      });
    } catch (err) {
      console.error('[PDF checklist]', err);
    } finally {
      setPdfLoading(false);
    }
  };
  const effMax = effectiveMaxTerm(p, state.answers);
  const explain = explainProgram(p, state.answers);
  const matchHi = score >= 70;

  return (
    <div
      className={`overflow-hidden rounded-[var(--radius-lg)] border bg-[var(--surface)] ${
        isTop ? 'border-[var(--primary)] ring-1 ring-[var(--primary)]' : 'border-[var(--border)]'
      }`}
    >
      {/* Баннер: фото программы (фолбэк — фирменный градиент), категория и % совпадения */}
      <div className="relative h-[120px] overflow-hidden bg-gradient-to-br from-[var(--primary)] to-[var(--primary-2)] text-white md:h-[132px]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/img/programs/${p.id}.jpg`}
          alt=""
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = 'none';
          }}
        />
        {/* Затемнение снизу — чтобы пилюли читались на любом фото */}
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(to top, rgba(4,40,24,0.65) 0%, rgba(4,40,24,0.15) 55%, rgba(4,40,24,0) 100%)' }}
          aria-hidden="true"
        />
        {isTop && (
          // Зелёная пилюля вместо жёлтой «ленты»: жёлтый+чёрный читается как
          // предупреждение и плохо виден на фото. Зелёный = бренд, позитив.
          <span className="absolute left-3 top-3 z-10 inline-flex items-center gap-1.5 rounded-full bg-[var(--primary)] px-3 py-1 text-[11px] font-bold text-white shadow-md">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} aria-hidden="true">
              <path d="M20 6L9 17l-5-5" />
            </svg>
            {t('bestMatch')}
          </span>
        )}
        <span className="absolute bottom-3 left-4 z-10 flex items-center gap-2">
          <span className="rounded-full bg-black/45 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur">
            {p.category}
          </span>
          {isLowestRate && (
            <span className="rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-bold text-[var(--primary)] shadow backdrop-blur">
              {t('lowestRate')}
            </span>
          )}
        </span>
        <span
          className={`absolute bottom-3 right-4 z-10 rounded-full px-3 py-1 text-sm font-bold ${
            matchHi ? 'bg-white text-[var(--primary)]' : 'bg-black/45 text-white backdrop-blur'
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

        {/* Обеспечение — вопрос №1 заёмщика (UX-исследование, finding ×2 персон).
            Точных per-program условий в публичном регламенте нет — честная общая
            формула без обещаний «без залога». */}
        <div className="mt-3 flex gap-2 rounded-[var(--radius)] bg-[var(--bg-tint)] px-4 py-3 text-sm leading-relaxed text-[var(--text-2)]">
          <span className="font-semibold text-[var(--text)]">{t('collateralLabel')}:</span>
          <span>{applyGlossary(t('collateralText'))}</span>
        </div>

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

        <div className="mt-5 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-[var(--text-3)]">{p.org}</span>
            <button
              type="button"
              onClick={() => apply(p.id)}
              className="inline-flex h-11 items-center justify-center rounded-[var(--radius)] bg-[var(--primary)] px-5 font-semibold text-white transition hover:bg-[var(--primary-2)]"
            >
              {t('applyCta')}
            </button>
          </div>
          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={pdfLoading}
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-[var(--radius)] border border-[var(--primary)] px-5 text-sm font-semibold text-[var(--primary)] transition hover:bg-[var(--primary-soft)] disabled:opacity-60"
          >
            {pdfLoading ? (
              <>
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  className="animate-spin"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="10" strokeOpacity={0.25} />
                  <path d="M12 2a10 10 0 0 1 10 10" />
                </svg>
                {t('checklistBtnLoading')}
              </>
            ) : (
              <>
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  aria-hidden="true"
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="12" y1="11" x2="12" y2="17" />
                  <polyline points="9 14 12 17 15 14" />
                </svg>
                {t('checklistBtn')}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export function Results() {
  const t = useTranslations('funnel.results');
  const { state, startQuiz, requestConsultation } = useFunnel();
  // Базовая сортировка — по % совпадения (бизнес-правило из легаси, lib не трогаем).
  // UI-добивка: при равном score выше программа с меньшей ставкой — полезнее клиенту.
  const scored = [...scoredPrograms(state.answers)].sort(
    (a, b) => b.score - a.score || a.program.rate - b.program.rate,
  );
  // Бейдж «Самая низкая ставка» — на карточке с минимальной ставкой среди подобранных.
  const lowestRateId =
    scored.length > 1
      ? scored.reduce((min, x) => (x.program.rate < min.program.rate ? x : min), scored[0]).program.id
      : null;

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
          <ResultCard
            key={x.program.id}
            program={x.program}
            score={x.score}
            isTop={i === 0}
            isLowestRate={x.program.id === lowestRateId}
          />
        ))}
      </div>
    </div>
  );
}
