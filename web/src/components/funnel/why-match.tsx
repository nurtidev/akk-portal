'use client';

// =====================================================
// ===== B3: WhyMatch — раскрывашка «Почему N% совпадения»
// renderWhyMatch из легаси (≈ 3607–3645): каждый soft-фактор профиля с вкладом;
// недоборы помечены «выше совпадение при ответе ...» (до +N). Пояснение про
// потолок программы, если все факторы максимальны, но score < 100.
// =====================================================

import { useTranslations } from 'next-intl';
import type { Explanation } from '@/lib/scoring';

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2b8a3e" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}
function WarnIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#e8a317" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>
  );
}

export function WhyMatch({ explain, score }: { explain: Explanation; score: number }) {
  const t = useTranslations('funnel.why');
  const factors = explain.softFactors;
  const allOptimal = factors.length > 0 && factors.every((f) => f.w >= f.maxW);

  return (
    <details className="mt-3 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface-warm)]">
      <summary className="cursor-pointer select-none px-4 py-3 text-sm font-medium text-[var(--text-2)] marker:text-[var(--text-3)]">
        {t('summary', { score })}
      </summary>
      <div className="space-y-2 px-4 pb-4">
        {factors.length > 0 ? (
          factors.map((f, i) => {
            const optimal = f.w >= f.maxW;
            return (
              <div key={i} className="rounded-[var(--radius-sm)] bg-[var(--surface)] p-3">
                <div className="flex items-center gap-2">
                  <span className="flex-none">{optimal ? <CheckIcon /> : <WarnIcon />}</span>
                  <span className="text-sm font-medium text-[var(--text)]">
                    {f.short}: {f.label}
                  </span>
                </div>
                <div className="mt-1 pl-6 text-xs text-[var(--text-3)]">
                  {optimal ? t('factorOk') : t('factorWarn', { best: f.bestLabel })}
                </div>
              </div>
            );
          })
        ) : (
          <div className="rounded-[var(--radius-sm)] bg-[var(--surface)] p-3 text-sm text-[var(--text-2)]">
            {t('hardOnly')}
          </div>
        )}

        {factors.length > 0 && score < 100 && allOptimal && (
          <p className="text-xs text-[var(--text-3)]">{t('noteCeiling', { score })}</p>
        )}
        {factors.length > 0 && score < 100 && !allOptimal && (
          <p className="text-xs text-[var(--text-3)]">{t('notePartial')}</p>
        )}
        {factors.length > 0 && score >= 100 && explain.rawScore > 100 && (
          <p className="text-xs text-[var(--text-3)]">{t('noteSurplus')}</p>
        )}
      </div>
    </details>
  );
}
