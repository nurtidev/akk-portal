'use client';

// =====================================================
// ===== Краткий блок председателя на главной ===========
// Тизер: фото + имя + должность + первые 2 абзаца
// приветствия + кнопка-ссылка на /blog.
// Располагается после «Как получить финансирование»
// и перед «Истории успеха».
// =====================================================

import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import { FallbackImage } from '@/components/content/hero-image';

export function ChairmanTeaser() {
  const tT = useTranslations('funnel.chairmanTeaser');
  const tB = useTranslations('content.blog');
  const locale = useLocale();

  // Берём только первые 2 абзаца из массива приветствия
  const paragraphs = (tB.raw('welcomeText') as string[]).slice(0, 2);

  return (
    <section
      className="py-12 md:py-16"
      aria-label={tT('title')}
    >
      <div className="container mx-auto px-4">
        <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-sm)] sm:p-8 md:p-10">

          {/* Eyebrow-метка */}
          <div className="mb-5">
            <span className="inline-block rounded-full bg-[var(--primary-soft)] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[var(--primary)]">
              {tT('eyebrow')}
            </span>
          </div>

          {/* Заголовок блока */}
          <h2 className="font-display text-2xl font-bold text-[var(--text)] md:text-3xl mb-6">
            {tT('title')}
          </h2>

          {/* Гибкий контейнер: мобиле — колонка, sm — строка */}
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start">

            {/* Круглый аватар председателя */}
            <div className="flex-shrink-0 self-center sm:self-start">
              <div className="h-28 w-28 sm:h-36 sm:w-36 rounded-full overflow-hidden bg-[var(--primary-soft)] flex items-center justify-center">
                <FallbackImage
                  src="/img/content/blog-chairman.jpg"
                  alt={tB('chairmanName')}
                  className="h-full w-full object-cover object-top"
                />
                {/* Фолбэк-инициалы: скрыты, пока картинка загружена */}
                <span
                  className="hidden text-2xl font-bold text-[var(--primary)]"
                  aria-hidden="true"
                >
                  АА
                </span>
              </div>
            </div>

            {/* Текстовый блок */}
            <div className="flex-1 min-w-0">
              {/* Имя и должность */}
              <p className="font-display text-base font-bold text-[var(--text)] leading-snug">
                {tB('chairmanName')}
              </p>
              <p className="mt-0.5 text-sm text-[var(--text-3)] mb-4">
                {tB('chairmanTitle')}
              </p>

              {/* Первые два абзаца приветствия */}
              <div className="space-y-3 text-sm leading-relaxed text-[var(--text-2)]">
                {paragraphs.map((paragraph, i) => (
                  <p key={i}>{paragraph}</p>
                ))}
              </div>

              {/* Кнопка «Читать далее» */}
              <div className="mt-6">
                <Link
                  href={`/${locale}/blog`}
                  className="inline-flex h-10 items-center gap-2 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg)] px-5 text-sm font-semibold text-[var(--text-2)] transition hover:border-[var(--primary)] hover:text-[var(--primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
                >
                  {tT('cta')}
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    aria-hidden="true"
                  >
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
