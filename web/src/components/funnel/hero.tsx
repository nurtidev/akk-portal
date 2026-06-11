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
import { useFunnel } from './funnel-context';

export function Hero() {
  const t = useTranslations('funnel.hero');
  const { startQuiz, requestConsultation } = useFunnel();
  const [photoOk, setPhotoOk] = useState(true);
  const imgRef = useRef<HTMLImageElement | null>(null);

  // onError может сработать ДО гидратации (SSR) и потеряться — проверяем
  // naturalWidth уже смонтированной картинки.
  useEffect(() => {
    const el = imgRef.current;
    if (el && el.complete && el.naturalWidth === 0) setPhotoOk(false);
  }, []);

  return (
    <section className="relative overflow-hidden">
      {/* Полноширинное фото: объект справа, слева — спокойная зона под текст */}
      {photoOk && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          ref={imgRef}
          src="/img/content/hero-main.jpg"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 hidden h-full w-full object-cover object-[72%_center] md:block"
          onError={() => setPhotoOk(false)}
        />
      )}
      {/* Градиент-«перетекание»: фото тает в фон страницы слева (и сверху чуть-чуть) */}
      {photoOk && (
        <div
          className="absolute inset-0 hidden md:block"
          style={{
            background:
              'linear-gradient(90deg, var(--bg) 0%, var(--bg) 34%, color-mix(in srgb, var(--bg) 55%, transparent) 52%, transparent 72%)',
          }}
          aria-hidden="true"
        />
      )}
      {/* Нижнее растворение: без него фото обрывалось жёсткой линией о следующую
          секцию (слева спасал боковой градиент, справа линия была голой) */}
      {photoOk && (
        <div
          className="absolute inset-x-0 bottom-0 hidden h-32 md:block"
          style={{
            background:
              'linear-gradient(to top, var(--bg) 0%, color-mix(in srgb, var(--bg) 60%, transparent) 50%, transparent 100%)',
          }}
          aria-hidden="true"
        />
      )}
      {/* Орнамент — в текстовой зоне */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: 'url(/ornament.svg)',
          backgroundSize: '120px',
          maskImage: 'linear-gradient(90deg, black 0%, black 40%, transparent 65%)',
          WebkitMaskImage: 'linear-gradient(90deg, black 0%, black 40%, transparent 65%)',
        }}
        aria-hidden="true"
      />

      <div className="container relative mx-auto px-4 py-16 md:py-24 lg:py-28">
        <div className="max-w-xl">
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
              onClick={requestConsultation}
              className="inline-flex h-12 items-center justify-center rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-6 font-semibold text-[var(--text-2)] transition hover:border-[var(--primary)] hover:text-[var(--primary)]"
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
