'use client';

// =====================================================
// ===== Истории успеха — scroll-snap лента =============
// Современный паттерн вместо авто-карусели: карточки свайпаются на мобиле
// и листаются стрелками на десктопе (scroll-snap, без сторонних библиотек).
// Данные — press-data (type: 'story'), фото — /img/content/stories/story-N.jpg.
// =====================================================

import { useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { getPressItemsByType } from '@/components/content/press-data';
import { FallbackImage } from '@/components/content/hero-image';

/** Фото карточек: slug истории → файл (индексный мапинг ломался при добавлении
    историй; комбайн-история использует фото программы Кең дала). */
const STORY_IMAGES: Record<string, string> = {
  'kostanay-fermer-ken-dala': '/img/programs/ken_dala.jpg',
  'almaty-oblast-igіlik-kozy': '/img/content/stories/story-1.jpg',
  'turkestan-syrovarnya-isker': '/img/content/stories/story-2.jpg',
  'pavlodar-teplica-investproekt': '/img/content/stories/story-3.jpg',
};

export function SuccessStories() {
  const t = useTranslations('funnel.stories');
  const pathname = usePathname();
  const locale = pathname.split('/')[1] || 'ru';
  const trackRef = useRef<HTMLDivElement | null>(null);

  const stories = getPressItemsByType('story');
  if (!stories.length) return null;

  const scrollByCard = (dir: 1 | -1) => {
    const el = trackRef.current;
    if (!el) return;
    const card = el.querySelector('article');
    const w = card ? card.getBoundingClientRect().width + 16 : 420;
    el.scrollBy({ left: dir * w, behavior: 'smooth' });
  };

  return (
    <section className="bg-[var(--bg-tint)] py-16 md:py-20" aria-label={t('title')}>
      <div className="container mx-auto px-4">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-bold text-[var(--text)] md:text-3xl">
              {t('title')}
            </h2>
            <p className="mt-2 max-w-xl text-[var(--text-2)]">{t('sub')}</p>
          </div>
          {/* Стрелки — только десктоп; на мобиле лента свайпается пальцем */}
          <div className="hidden gap-2 md:flex">
            <ArrowBtn dir={-1} onClick={() => scrollByCard(-1)} label={t('prev')} />
            <ArrowBtn dir={1} onClick={() => scrollByCard(1)} label={t('next')} />
          </div>
        </div>
      </div>

      {/* Лента: выезжает за контейнер справа (паттерн нео-финтех) */}
      <div className="container mx-auto px-4">
        <div
          ref={trackRef}
          className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {stories.map((s) => (
            <article
              key={s.slug}
              className="w-[85%] flex-shrink-0 snap-start overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-sm)] sm:w-[420px]"
            >
              <div
                className="relative h-[180px] overflow-hidden"
                style={{ background: s.imagePlaceholder || 'var(--primary-soft)' }}
              >
                <FallbackImage
                  src={STORY_IMAGES[s.slug] || `/img/content/stories/${s.slug}.jpg`}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover"
                />
              </div>
              <div className="flex flex-col p-5">
                {/* Герой истории: аватар (кроп фото) + имя + область — паттерн руководителя */}
                {s.personRu && (
                  <div className="mb-3 flex items-center gap-3">
                    <span className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-full border border-[var(--border)]">
                      <FallbackImage
                        src={STORY_IMAGES[s.slug] || ''}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    </span>
                    <span>
                      <span className="block text-sm font-semibold text-[var(--text)]">{s.personRu}</span>
                      {s.regionRu && (
                        <span className="block text-xs text-[var(--text-3)]">{s.regionRu}</span>
                      )}
                    </span>
                  </div>
                )}
                <p className="text-sm italic leading-relaxed text-[var(--text-2)] [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:4] overflow-hidden">
                  «{s.quoteRu || s.leadRu}»
                </p>
                <Link
                  href={`/${locale}/press/${s.slug}`}
                  className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--primary)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] rounded"
                >
                  {t('readMore')}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function ArrowBtn({ dir, onClick, label }: { dir: 1 | -1; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--text-2)] transition hover:border-[var(--primary)] hover:text-[var(--primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
        {dir === 1 ? <path d="M9 18l6-6-6-6" /> : <path d="M15 18l-6-6 6-6" />}
      </svg>
    </button>
  );
}
