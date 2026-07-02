'use client';

// =====================================================
// ImpactMarquee — «АКК в масштабе страны»: бегущая лента достижений под hero.
// Карточка — flip: лицо = прямой факт (фото 16:9 + число + фраза), оборот =
// «вау»-сравнение (funFact). Переворот двумя способами:
//   1) наведение мышкой/фокус — карточка переворачивается, лента встаёт;
//   2) авто: лента периодически останавливается, переворачивает карточку,
//      оказавшуюся по центру, даёт ~3 сек на прочтение и едет дальше (каждый
//      раз — та, что по центру; выбор «случайный» за счёт позиции ленты).
//
// Оформление — на дизайн-токенах сайта; переход от hero — мягкий градиент
// (--bg → --primary-tint → --bg), без жёсткого бордера. Данные/значения —
// @/data/akk-impact. Тексты — i18n (funnel.impact). prefers-reduced-motion:
// лента и авто-переворот отключаются (см. globals.css + проверка в эффекте).
// =====================================================

import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { AKK_IMPACT_FACTS, type ImpactFact } from '@/data/akk-impact';

// --------------------------------------------------
// Фото факта 16:9 с фолбэком (зелёный градиент); при 404 прячем img.
// --------------------------------------------------
function ImpactPhoto({ factKey }: { factKey: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className="relative aspect-[16/9] w-full shrink-0 overflow-hidden bg-gradient-to-br from-[var(--primary)] to-[var(--primary-2)]">
      {!failed && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/img/impact/${factKey}.jpg`}
          alt=""
          aria-hidden
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      )}
    </div>
  );
}

// --------------------------------------------------
// Счётчик 0 → target при start=true (easeOutCubic).
// Форматируем ЧИСЛО ВРУЧНУЮ (пробел-разряды, запятая для ru/kk, точка для en) —
// НЕ через Intl: ICU у Node и браузера расходится по разделителю для kk-KZ и
// ломает гидратацию (server «0,0» vs client «0.0»).
// --------------------------------------------------
function fmtNumber(n: number, decimals: number, locale: string): string {
  const fixed = Math.abs(n).toFixed(decimals);
  const [intPart, frac] = fixed.split('.');
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ' '); // NBSP-разряды
  const dec = locale === 'en' ? '.' : ',';
  return (n < 0 ? '-' : '') + grouped + (frac ? dec + frac : '');
}

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
  return <span className="tabular-nums">{fmtNumber(start ? value : 0, decimals, locale)}</span>;
}

// --------------------------------------------------
// Карточка-факт: flip (лицо + оборот).
// --------------------------------------------------
function Card({
  fact,
  started,
  locale,
  flipped,
  cardRef,
}: {
  fact: ImpactFact;
  started: boolean;
  locale: string;
  flipped: boolean;
  cardRef: (el: HTMLElement | null) => void;
}) {
  const t = useTranslations('funnel.impact');
  return (
    <article ref={cardRef} className="flip h-[336px] w-60 shrink-0 sm:w-72">
      <div className={`flip-inner ${flipped ? 'is-flipped' : ''}`}>
        {/* ЛИЦО — прямой факт */}
        <div className="flip-face flex flex-col overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-sm)]">
          <ImpactPhoto factKey={fact.key} />
          <div className="flex flex-1 flex-col items-center justify-center px-5 py-4 text-center">
            {fact.format === 'percent' ? (
              <div className="font-display text-4xl font-bold leading-none text-[var(--primary)] sm:text-5xl">
                <Counter target={fact.value} start={started} decimals={0} locale={locale} />%
              </div>
            ) : (
              <>
                <div className="font-display text-4xl font-bold leading-none text-[var(--primary)] sm:text-[2.6rem]">
                  <Counter target={fact.value} start={started} decimals={fact.decimals ?? 0} locale={locale} />
                </div>
                <div className="mt-0.5 text-sm font-semibold uppercase tracking-wide text-[var(--accent-2)]">
                  {t(`items.${fact.key}.unit`)}
                </div>
              </>
            )}
            <div className="mt-1.5 font-display text-[14px] font-bold leading-tight text-[var(--text)]">
              {t(`items.${fact.key}.statement`)}
            </div>
          </div>
        </div>

        {/* ОБОРОТ — «вау»-сравнение */}
        <div className="flip-face flip-back flex flex-col items-center justify-center gap-3 overflow-hidden rounded-[var(--radius-lg)] border border-[var(--primary-2)] bg-[var(--primary)] px-6 text-center text-white shadow-[var(--shadow-sm)]">
          <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
            {t('funFactEyebrow')}
          </span>
          <p className="font-display text-xl font-bold leading-snug">{t(`items.${fact.key}.back`)}</p>
        </div>
      </div>
    </article>
  );
}

// --------------------------------------------------
// Секция целиком
// --------------------------------------------------
export function ImpactMarquee() {
  const t = useTranslations('funnel.impact');
  const locale = useLocale();
  const sectionRef = useRef<HTMLElement | null>(null);
  const marqueeRef = useRef<HTMLDivElement | null>(null);
  const cardRefs = useRef<(HTMLElement | null)[]>([]);
  const [started, setStarted] = useState(false);
  const [paused, setPaused] = useState(false);
  const [autoFlip, setAutoFlip] = useState<number>(-1);

  // Индекс карточки, оказавшейся по центру ленты (полностью видимой).
  const centeredIndex = useCallback(() => {
    const c = marqueeRef.current;
    if (!c) return -1;
    const cr = c.getBoundingClientRect();
    const cx = cr.left + cr.width / 2;
    let best = -1;
    let bd = Infinity;
    cardRefs.current.forEach((el, i) => {
      if (!el) return;
      const r = el.getBoundingClientRect();
      if (r.left < cr.left - 8 || r.right > cr.right + 8) return; // только целиком видимые
      const d = Math.abs((r.left + r.right) / 2 - cx);
      if (d < bd) {
        bd = d;
        best = i;
      }
    });
    return best;
  }, []);

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

  // Авто-цикл: стоп → переворот центральной карточки → 3 сек → едем дальше.
  useEffect(() => {
    if (!started) return;
    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    let cancelled = false;
    const timers = new Set<ReturnType<typeof setTimeout>>();
    const wait = (ms: number, fn: () => void) => {
      const id = setTimeout(() => {
        timers.delete(id);
        if (!cancelled) fn();
      }, ms);
      timers.add(id);
    };
    const cycle = () => {
      setPaused(true);
      // дать transform ленты «застыть» и измерить центр
      requestAnimationFrame(() => {
        if (cancelled) return;
        setAutoFlip(centeredIndex());
        wait(3000, () => {
          setAutoFlip(-1);
          wait(700, () => {
            setPaused(false);
            wait(5000, cycle);
          });
        });
      });
    };
    wait(4500, cycle);
    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
  }, [started, centeredIndex]);

  // Дублируем список ×2 для бесшовной ленты (сдвиг -50% в CSS).
  const track = [...AKK_IMPACT_FACTS, ...AKK_IMPACT_FACTS];

  return (
    <section
      ref={sectionRef}
      aria-label={t('title')}
      className="py-16 md:py-24"
      style={{
        // Мягкий переход: сверху сливается с фоном hero, к середине — тинт,
        // снизу снова фон (без жёсткого бордера-линии).
        background:
          'linear-gradient(to bottom, var(--bg) 0, var(--primary-tint) 160px, var(--primary-tint) calc(100% - 160px), var(--bg) 100%)',
      }}
    >
      <div className="container mx-auto mb-10 px-4 text-center">
        <div className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-[var(--accent-2)]">{t('eyebrow')}</div>
        <h2 className="font-display text-3xl font-bold text-[var(--text)] sm:text-5xl">{t('title')}</h2>
      </div>

      {/* Лента: маска-угасание по краям, скроллбар скрыт, авто-прокрутка трека */}
      <div
        ref={marqueeRef}
        className="impact-marquee overflow-x-auto"
        style={{
          maskImage: 'linear-gradient(to right, transparent, #000 5%, #000 95%, transparent)',
          WebkitMaskImage: 'linear-gradient(to right, transparent, #000 5%, #000 95%, transparent)',
        }}
      >
        <div className={`impact-track flex gap-4 px-4 py-2 ${paused ? 'is-paused' : ''}`}>
          {track.map((fact, i) => (
            <Card
              key={`${fact.key}-${i}`}
              fact={fact}
              started={started}
              locale={locale}
              flipped={autoFlip === i}
              cardRef={(el) => {
                cardRefs.current[i] = el;
              }}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
