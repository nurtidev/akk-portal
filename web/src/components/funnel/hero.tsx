'use client';

// =====================================================
// ===== B7: Hero — full-bleed (виденье руководителя) ==
// Фото на всю ширину первого экрана, слева «тает» в фон страницы через
// градиент (var(--bg) — работает в обеих темах); текст и CTA — на спокойной
// зоне слева. На мобиле фото скрыто (текст и кнопки приоритетнее).
// CTA: «Подобрать программу» (квиз) + «Получить консультацию» (поток
// консультации без программы). Без фото — прежний фон с орнаментом.
// =====================================================

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { AKK_STATS } from '@/data/akk-stats';
import { useFunnel } from './funnel-context';

export function Hero() {
  const t = useTranslations('funnel.hero');
  const tw = useTranslations('funnel.whyAkk');
  const { startQuiz, requestConsultation } = useFunnel();

  // Ключевые цифры — теперь прямо в hero, компактной строкой под кнопками
  // (чтобы первый экран = hero + метрики). Источник тот же: akk-stats + i18n.
  const stats: { value: string; label: string }[] = [
    { value: AKK_STATS.portfolio, label: t('statPortfolioLabel') },
    { value: AKK_STATS.clients, label: t('statClientsLabel') },
    { value: AKK_STATS.financed, label: t('statFinancedLabel') },
    { value: tw('b.value'), label: t('statRatingLabel') }, // рейтинг Fitch BBB (короткая подпись для hero)
  ];
  const [photoOk, setPhotoOk] = useState(true);
  const [nightOk, setNightOk] = useState(true);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const nightRef = useRef<HTMLImageElement | null>(null);

  // onError может сработать ДО гидратации (SSR) и потеряться — проверяем
  // naturalWidth уже смонтированной картинки.
  useEffect(() => {
    const el = imgRef.current;
    if (el && el.complete && el.naturalWidth === 0) setPhotoOk(false);
    const nel = nightRef.current;
    if (nel && nel.complete && nel.naturalWidth === 0) setNightOk(false);
  }, []);

  return (
    // Полноэкранный hero первого вида: на всю ширину страницы (full-bleed),
    // высокий (≈первый вьюпорт), контент вертикально по центру. Фото справа
    // «тает» в фон страницы слева; на мобиле фото скрыто, фон — мягкий
    // брендовый градиент, чтобы экран не был пустым.
    <section className="relative isolate flex w-full items-center overflow-hidden min-h-[calc(100svh-4rem)]">
      {/* Полноширинное фото: объект справа, слева — спокойная зона под текст.
          Светлая тема — день; тёмная — ночная версия с включёнными фарами
          («комбайн убирает в ночи»), плавный кросс-фейд при смене темы.
          Пока ночного файла нет — дневное фото остаётся в обеих темах. */}
      {photoOk && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          ref={imgRef}
          src="/img/content/hero-main.jpg"
          alt=""
          aria-hidden="true"
          className={`absolute inset-0 hidden h-full w-full object-cover object-[72%_center] transition-opacity duration-700 md:block ${nightOk ? 'dark:opacity-0' : ''}`}
          onError={() => setPhotoOk(false)}
        />
      )}
      {nightOk && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          ref={nightRef}
          src="/img/content/hero-main-night.jpg"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 hidden h-full w-full object-cover object-[72%_center] opacity-0 transition-opacity duration-700 dark:opacity-100 md:block"
          onError={() => setNightOk(false)}
        />
      )}
      {/* Градиент-«перетекание»: фото тает в фон страницы слева (десктоп) */}
      {photoOk && (
        <div
          className="absolute inset-0 hidden md:block"
          style={{
            background:
              'linear-gradient(90deg, var(--bg) 0%, var(--bg) 32%, color-mix(in srgb, var(--bg) 58%, transparent) 50%, transparent 72%)',
          }}
          aria-hidden="true"
        />
      )}
      {/* Мобильный фон: мягкий брендовый градиент (фото на мобиле скрыто) */}
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
      {/* Орнамент — в текстовой зоне */}
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
          <h1 className="mt-6 font-display text-4xl font-bold leading-[1.08] tracking-tight text-[var(--text)] sm:text-5xl">
            {t('titleStart')} <em className="not-italic text-[var(--primary)]">{t('titleEm')}</em>{' '}
            {t('titleEnd')}
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

          {/* Метрики — компактной строкой под кнопками (на десктопе 4 в ряд,
              на мобиле 2×2). Каждый показатель — с брендовым акцентом слева.
              Значение — в одну строку (whitespace-nowrap), подпись — контрастная. */}
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
        </div>
      </div>
    </section>
  );
}
