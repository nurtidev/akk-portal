'use client';

// =====================================================
// ImpactMarquee — «АКК в масштабе страны»: горизонтальная авто-лента
// достижений сразу под hero. Карточки-факты сами проезжают справа налево
// (бесшовный цикл), пауза при наведении/фокусе. Крупный визуал — картинка
// /img/impact/<key>.png (генерится отдельно, напр. в Gemini); пока файла нет —
// показывается плейсхолдер. Значение — процент (пиктограмма) или счётчик,
// отсчитывается вверх при появлении ленты.
//
// Оформление — на дизайн-токенах сайта (тема-aware). Данные и значения —
// @/data/akk-impact (одна точка правки). Тексты — i18n (funnel.impact).
// prefers-reduced-motion: лента застывает, листается вручную (см. globals.css).
// =====================================================

import { useEffect, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { AKK_IMPACT_FACTS, type ImpactFact } from '@/data/akk-impact';

// --------------------------------------------------
// Картинка факта с плейсхолдером. Пока /img/impact/<key>.png нет —
// рисуем пунктирный плейсхолдер с именем файла (подскажет, что положить).
// --------------------------------------------------
function ImpactImage({ factKey }: { factKey: string }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <div className="relative h-28 w-full overflow-hidden rounded-[var(--radius)] sm:h-32">
      {/* Плейсхолдер — всегда снизу; проступает, пока картинки нет */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 rounded-[var(--radius)] border border-dashed border-[var(--border)] bg-[var(--primary-soft)] text-[var(--text-3)]">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <path d="m21 15-5-5L5 21" />
        </svg>
        <span className="text-[11px] font-medium">{factKey}.png</span>
      </div>
      {/* Картинка — поверх, проявляется только при успешной загрузке */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/img/impact/${factKey}.png`}
        alt=""
        aria-hidden
        className={`absolute inset-0 h-full w-full object-contain transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
        onLoad={() => setLoaded(true)}
      />
    </div>
  );
}

// --------------------------------------------------
// Счётчик 0 → target при start=true (easeOutCubic). Формат — по локали.
// --------------------------------------------------
const INTL_LOCALE: Record<string, string> = { kk: 'kk-KZ', ru: 'ru-RU', en: 'en-US' };

function Counter({ target, start, decimals, locale }: { target: number; start: boolean; decimals: number; locale: string }) {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number | null>(null);
  useEffect(() => {
    if (!start) return;
    const duration = 1600;
    let startTs: number | null = null;
    const tick = (ts: number) => {
      if (startTs === null) startTs = ts;
      const p = Math.min((ts - startTs) / duration, 1);
      setValue(target * (1 - Math.pow(1 - p, 3)));
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [start, target]);
  const shown = new Intl.NumberFormat(INTL_LOCALE[locale] ?? 'ru-RU', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(start ? value : 0);
  return <span className="tabular-nums">{shown}</span>;
}

// --------------------------------------------------
// Карточка-факт (на токенах сайта: surface + border + shadow)
// --------------------------------------------------
function Card({ fact, started, locale }: { fact: ImpactFact; started: boolean; locale: string }) {
  const t = useTranslations('funnel.impact');
  return (
    <article className="flex w-64 shrink-0 flex-col items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] px-5 py-6 text-center shadow-[var(--shadow-sm)] sm:w-72">
      <ImpactImage factKey={fact.key} />

      {fact.kind === 'pictogram' ? (
        <>
          {/* Крупный процент + слоган */}
          <div className="font-display text-4xl font-bold leading-none text-[var(--primary)] sm:text-5xl">
            {fact.percent}%
          </div>
          <div className="font-display text-lg font-bold leading-tight text-[var(--text)]">
            {t(`items.${fact.key}.headline`)}
          </div>
        </>
      ) : (
        <>
          {/* Крупное число, единица — отдельной строкой под ним (чтобы влезало) */}
          <div className="font-display text-4xl font-bold leading-none text-[var(--primary)] sm:text-5xl">
            <Counter target={fact.count} start={started} decimals={fact.decimals ?? 0} locale={locale} />
          </div>
          <div className="-mt-1 text-sm font-semibold uppercase tracking-wide text-[var(--accent-2)]">
            {t(`items.${fact.key}.unit`)}
          </div>
        </>
      )}

      <p className="text-sm leading-snug text-[var(--text-2)]">{t(`items.${fact.key}.caption`)}</p>
    </article>
  );
}

// --------------------------------------------------
// Секция целиком (фон — --primary-tint, как у остальных полос лендинга)
// --------------------------------------------------
export function ImpactMarquee() {
  const t = useTranslations('funnel.impact');
  const locale = useLocale();
  const sectionRef = useRef<HTMLElement | null>(null);
  const [started, setStarted] = useState(false);

  // Счётчики стартуют один раз, когда лента впервые попадает во вьюпорт.
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') {
      setStarted(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setStarted(true);
          io.disconnect();
        }
      },
      { threshold: 0.2 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Дублируем список ×2 для бесшовной ленты (сдвиг -50% в CSS).
  const track = [...AKK_IMPACT_FACTS, ...AKK_IMPACT_FACTS];

  return (
    <section
      ref={sectionRef}
      aria-label={t('title')}
      className="border-y border-[var(--border)] bg-[var(--primary-tint)] py-14 md:py-20"
    >
      <div className="container mx-auto mb-10 px-4 text-center">
        <div className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-[var(--accent-2)]">{t('eyebrow')}</div>
        <h2 className="font-display text-3xl font-bold text-[var(--text)] sm:text-5xl">{t('title')}</h2>
      </div>

      {/* Лента: маска-угасание по краям, скроллбар скрыт, авто-прокрутка трека */}
      <div
        className="impact-marquee overflow-x-auto"
        style={{
          maskImage: 'linear-gradient(to right, transparent, #000 5%, #000 95%, transparent)',
          WebkitMaskImage: 'linear-gradient(to right, transparent, #000 5%, #000 95%, transparent)',
        }}
      >
        <div className="impact-track flex gap-4 px-4 pb-2">
          {track.map((fact, i) => (
            <Card key={`${fact.key}-${i}`} fact={fact} started={started} locale={locale} />
          ))}
        </div>
      </div>
    </section>
  );
}
