'use client';

// =====================================================
// ===== B7: Hero ======================================
// Перенос секции hero из index.html (≈ 2207–2276): эмблема (radar + марка),
// eyebrow, заголовок с акцентом, lede, CTA «Начать подбор» + «Все программы»,
// статистика «от 5% / 6 программ / 15 млрд ₸».
// =====================================================

import { useTranslations } from 'next-intl';
import { AkkMark } from '@/components/icons/akk-mark';
import { useFunnel } from './funnel-context';

export function Hero() {
  const t = useTranslations('funnel.hero');
  const { startQuiz } = useFunnel();

  const scrollToPrograms = () => {
    document.getElementById('programs')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="relative overflow-hidden">
      {/* Орнамент-фон */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{ backgroundImage: 'url(/ornament.svg)', backgroundSize: '120px' }}
        aria-hidden="true"
      />
      <div className="container relative mx-auto px-4 py-16 md:py-24">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-medium text-[var(--text-2)]">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
              {t('eyebrow')}
            </span>
            <h1 className="mt-5 font-display text-4xl font-bold leading-tight text-[var(--text)] md:text-5xl">
              {t('titleStart')} <em className="not-italic text-[var(--primary)]">{t('titleEm')}</em>{' '}
              {t('titleEnd')}
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-[var(--text-2)]">{t('lede')}</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={startQuiz}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-[var(--radius)] bg-[var(--primary)] px-6 font-semibold text-white transition hover:bg-[var(--primary-2)]"
              >
                {t('cta')}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </button>
              <button
                type="button"
                onClick={scrollToPrograms}
                className="inline-flex h-12 items-center justify-center rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-6 font-semibold text-[var(--text-2)] transition hover:border-[var(--primary)]"
              >
                {t('ctaAlt')}
              </button>
            </div>

            <div className="mt-10 grid max-w-lg grid-cols-3 gap-4">
              <Stat value={t('stat1Value')} label={t('stat1Label')} />
              <Stat value={t('stat2Value')} label={t('stat2Label')} />
              <Stat value={t('stat3Value')} label={t('stat3Label')} />
            </div>
          </div>

          {/* Эмблема-радар */}
          <div className="relative hidden aspect-square items-center justify-center lg:flex">
            <div className="absolute inset-[10%] rounded-full bg-[var(--primary-soft)] blur-3xl" aria-hidden="true" />
            <svg className="absolute inset-0 h-full w-full text-[var(--accent)] opacity-40" viewBox="0 0 400 400" fill="none" aria-hidden="true">
              <circle cx="200" cy="200" r="196" stroke="currentColor" strokeWidth={1} strokeDasharray="2 7" />
              <circle cx="200" cy="200" r="150" stroke="currentColor" strokeWidth={1} strokeDasharray="2 7" />
              <circle cx="200" cy="200" r="104" stroke="currentColor" strokeWidth={1} />
            </svg>
            <AkkMark className="relative h-2/5 w-2/5" />
          </div>
        </div>
      </div>
    </section>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div className="font-display text-2xl font-bold text-[var(--primary)] md:text-3xl">{value}</div>
      <div className="mt-1 text-xs leading-snug text-[var(--text-3)]">{label}</div>
    </div>
  );
}
