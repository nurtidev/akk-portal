'use client';

// =====================================================
// ===== Hero — full-bleed (виденье руководителя) ======
// Фоновое ВИДЕО комбайна на всю ширину первого экрана (день — светлая тема,
// ночь с фарами — тёмная, плавный кросс-фейд по теме). Слева «тает» в фон
// через градиент; на мобиле видео скрыто (текст приоритетнее, фон — градиент).
// Постер каждого видео — соответствующее фото (фолбэк, пока/если видео не
// подгрузилось). prefers-reduced-motion → видео на паузе.
// Заголовок — миссия; CTA: «Подобрать программу» + «Получить консультацию».
// =====================================================

import { useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { AKK_STATS } from '@/data/akk-stats';
import { useFunnel } from './funnel-context';

export function Hero() {
  const t = useTranslations('funnel.hero');
  const tw = useTranslations('funnel.whyAkk');
  const { startQuiz, requestConsultation } = useFunnel();
  const sectionRef = useRef<HTMLElement | null>(null);

  // Ключевые цифры — компактной строкой под кнопками.
  const stats: { value: string; label: string }[] = [
    { value: AKK_STATS.portfolio, label: t('statPortfolioLabel') },
    { value: AKK_STATS.clients, label: t('statClientsLabel') },
    { value: AKK_STATS.financed, label: t('statFinancedLabel') },
    { value: tw('b.value'), label: t('statRatingLabel') }, // рейтинг Fitch BBB
  ];

  // Доступность: при prefers-reduced-motion ставим фоновые видео на паузу
  // (остаётся спокойный кадр/постер).
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      sectionRef.current?.querySelectorAll('video').forEach((v) => v.pause());
    }
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative isolate flex w-full items-center overflow-hidden min-h-[calc(100svh-4rem)]"
    >
      {/* Фоновое видео — день (светлая тема). Постер-фото = фолбэк. */}
      <video
        className="absolute inset-0 hidden h-full w-full object-cover object-[72%_center] transition-opacity duration-700 md:block dark:opacity-0"
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        poster="/img/content/hero-main.jpg"
        aria-hidden="true"
      >
        <source src="/img/content/hero-main.mp4" type="video/mp4" />
      </video>
      {/* Фоновое видео — ночь с фарами (тёмная тема). */}
      <video
        className="absolute inset-0 hidden h-full w-full object-cover object-[72%_center] opacity-0 transition-opacity duration-700 md:block dark:opacity-100"
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        poster="/img/content/hero-main-night.jpg"
        aria-hidden="true"
      >
        <source src="/img/content/hero-main-night.mp4" type="video/mp4" />
      </video>

      {/* Градиент-«перетекание»: видео тает в фон страницы слева (десктоп) */}
      <div
        className="absolute inset-0 hidden md:block"
        style={{
          background:
            'linear-gradient(90deg, var(--bg) 0%, var(--bg) 32%, color-mix(in srgb, var(--bg) 58%, transparent) 50%, transparent 72%)',
        }}
        aria-hidden="true"
      />
      {/* Мобильный фон: мягкий брендовый градиент (видео на мобиле скрыто) */}
      <div
        className="absolute inset-0 md:hidden"
        style={{
          background:
            'radial-gradient(130% 90% at 100% 0%, var(--primary-soft) 0%, transparent 55%), linear-gradient(180deg, var(--bg) 0%, var(--bg) 100%)',
        }}
        aria-hidden="true"
      />
      {/* Нижнее растворение в следующую секцию (мягкий стык) */}
      <div
        className="absolute inset-x-0 bottom-0 h-24 md:h-36"
        style={{
          background:
            'linear-gradient(to top, var(--bg) 0%, color-mix(in srgb, var(--bg) 55%, transparent) 55%, transparent 100%)',
        }}
        aria-hidden="true"
      />
      {/* Орнамент — в текстовой зоне слева */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage: 'url(/ornament.svg)',
          backgroundSize: '120px',
          maskImage: 'linear-gradient(90deg, black 0%, black 42%, transparent 66%)',
          WebkitMaskImage: 'linear-gradient(90deg, black 0%, black 42%, transparent 66%)',
        }}
        aria-hidden="true"
      />

      <div className="container relative mx-auto w-full px-4 py-12 md:py-14">
        <div className="max-w-2xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)]/80 px-3.5 py-1.5 text-xs font-medium text-[var(--text-2)] shadow-[var(--shadow-sm)] backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
            {t('eyebrow')}
          </span>
          {/* H1 — миссия: «Финансируем тех, кто кормит страну» */}
          <h1 className="mt-6 font-display text-4xl font-bold leading-[1.08] tracking-tight text-[var(--text)] sm:text-5xl md:text-6xl">
            {t('missionLead')} <em className="not-italic text-[var(--primary)]">{t('missionEm')}</em>
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-[var(--text-2)] md:text-lg">
            {t('lede')}
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={startQuiz}
              className="inline-flex h-[52px] items-center justify-center gap-2 rounded-[var(--radius)] bg-[var(--primary)] px-7 text-base font-semibold text-white shadow-[var(--shadow-sm)] transition hover:bg-[var(--primary-2)] hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2"
            >
              {t('cta')}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
            <button
              type="button"
              onClick={requestConsultation}
              className="inline-flex h-[52px] items-center justify-center rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-7 text-base font-semibold text-[var(--text)] shadow-[var(--shadow-sm)] transition hover:border-[var(--primary)] hover:text-[var(--primary)] hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2"
            >
              {t('ctaAlt')}
            </button>
          </div>

          {/* Метрики — компактной строкой под кнопками (4 в ряд / 2×2 на мобиле) */}
          <dl className="mt-8 grid grid-cols-2 gap-x-5 gap-y-4 sm:grid-cols-4">
            {stats.map((s, i) => (
              <div key={i} className="border-l-2 border-[var(--primary)] pl-3">
                <dt className="whitespace-nowrap font-display text-base font-bold leading-tight text-[var(--primary)] md:text-lg">
                  {s.value}
                </dt>
                <dd className="mt-1 line-clamp-2 text-xs font-medium leading-snug text-[var(--text-2)]">
                  {s.label}
                </dd>
              </div>
            ))}
          </dl>
          {/* Пометка периода: показатели — по итогам 2025 года */}
          <p className="mt-3 text-xs text-[var(--text-3)]">{t('statsNote')}</p>
        </div>
      </div>
    </section>
  );
}
