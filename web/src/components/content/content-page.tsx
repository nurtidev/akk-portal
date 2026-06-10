import Link from "next/link";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface ContentPageProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: BreadcrumbItem[];
  eyebrow?: string;
  children: React.ReactNode;
}

/**
 * ContentPage — базовый шаблон контентной страницы (C1).
 * - Хлебные крошки (опционально)
 * - Заголовок h1 + подзаголовок
 * - prose-контент через children
 * SSG: никаких runtime-данных, generateStaticParams в каждой странице.
 */
export function ContentPage({
  title,
  subtitle,
  breadcrumbs,
  eyebrow,
  children,
}: ContentPageProps) {
  return (
    <main id="main-content" className="flex-1">
      {/* Hero-шапка страницы */}
      <div className="relative overflow-hidden bg-[var(--primary)] text-white">
        {/* Орнамент-паттерн (декоративный) */}
        <div className="ornament-tile absolute inset-0" aria-hidden="true" />
        <div className="container relative mx-auto px-4 py-10 md:py-14">
          {/* Хлебные крошки */}
          {breadcrumbs && breadcrumbs.length > 0 && (
            <nav
              aria-label="Хлебные крошки"
              className="mb-4 flex flex-wrap items-center gap-1.5 text-sm text-white/70"
            >
              {breadcrumbs.map((crumb, i) => (
                <span key={i} className="flex items-center gap-1.5">
                  {i > 0 && (
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="opacity-50"
                      aria-hidden="true"
                    >
                      <path d="M9 18l6-6-6-6" />
                    </svg>
                  )}
                  {crumb.href ? (
                    <Link
                      href={crumb.href}
                      className="hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 rounded"
                    >
                      {crumb.label}
                    </Link>
                  ) : (
                    <span className="text-white/90">{crumb.label}</span>
                  )}
                </span>
              ))}
            </nav>
          )}

          {/* Eyebrow */}
          {eyebrow && (
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-[var(--accent)] opacity-90">
              {eyebrow}
            </p>
          )}

          {/* Заголовок */}
          <h1 className="font-display text-2xl font-bold leading-tight text-white sm:text-3xl md:text-4xl">
            {title}
          </h1>

          {/* Подзаголовок */}
          {subtitle && (
            <p className="mt-2 text-base text-white/75 md:text-lg">{subtitle}</p>
          )}
        </div>
      </div>

      {/* Тело страницы */}
      <div className="container mx-auto px-4 py-10 md:py-14">{children}</div>
    </main>
  );
}

/** Секция внутри контентной страницы */
export function ContentSection({
  title,
  children,
  className = "",
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`mb-10 last:mb-0 ${className}`}>
      {title && (
        <h2 className="font-display text-xl font-semibold text-[var(--primary)] mb-5 pb-2 border-b border-[var(--border)]">
          {title}
        </h2>
      )}
      {children}
    </section>
  );
}

/** Prose-обёртка для обычного текстового контента */
export function Prose({ children }: { children: React.ReactNode }) {
  return (
    <div className="prose prose-sm max-w-none text-[var(--text-2)] leading-relaxed [&_p]:mb-4 [&_ul]:mb-4 [&_ul]:pl-5 [&_li]:mb-1 [&_strong]:text-[var(--text)] [&_a]:text-[var(--primary)] [&_a:hover]:underline">
      {children}
    </div>
  );
}

/** Сетка карточек (2–4 колонки) */
export function CardGrid({
  children,
  cols = 3,
}: {
  children: React.ReactNode;
  cols?: 2 | 3 | 4;
}) {
  const colClass =
    cols === 4
      ? "sm:grid-cols-2 lg:grid-cols-4"
      : cols === 3
        ? "sm:grid-cols-2 lg:grid-cols-3"
        : "sm:grid-cols-2";
  return (
    <div className={`grid grid-cols-1 gap-4 ${colClass}`}>{children}</div>
  );
}

/** Карточка */
export function ContentCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-sm)] ${className}`}
    >
      {children}
    </div>
  );
}

/** Аккордеон-элемент (FAQ) */
export function AccordionItem({
  question,
  answer,
}: {
  question: string;
  answer: string;
}) {
  // Клиентская интерактивность — управляется через details/summary (нативный HTML, без JS)
  return (
    <details className="group border-b border-[var(--border)] last:border-0">
      <summary className="flex cursor-pointer items-start justify-between gap-4 py-4 font-medium text-[var(--text)] hover:text-[var(--primary)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] rounded list-none [&::-webkit-details-marker]:hidden">
        <span>{question}</span>
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="mt-0.5 flex-shrink-0 text-[var(--text-3)] transition-transform duration-200 group-open:rotate-180"
          aria-hidden="true"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </summary>
      <div className="pb-4 pt-1 text-[var(--text-2)] text-sm leading-relaxed">
        {answer}
      </div>
    </details>
  );
}

/** Таблица файлов-документов */
export function DocumentList({
  items,
  downloadLabel,
}: {
  items: Array<{ title: string; url: string; meta?: string }>;
  downloadLabel: string;
}) {
  return (
    <ul className="divide-y divide-[var(--border)]">
      {items.map((item, i) => (
        <li
          key={i}
          className="flex items-center gap-4 py-3 hover:bg-[var(--primary-tint)] transition-colors rounded-[var(--radius-sm)] px-2 -mx-2"
        >
          {/* PDF-иконка */}
          <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--danger-soft)] text-[var(--danger)] text-xs font-bold">
            PDF
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-[var(--text)]">
              {item.title}
            </p>
            {item.meta && (
              <p className="text-xs text-[var(--text-3)]">{item.meta}</p>
            )}
          </div>
          <a
            href={item.url}
            className="flex-shrink-0 rounded-[var(--radius-sm)] bg-[var(--primary-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--primary)] hover:bg-[var(--primary)] hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
            target="_blank"
            rel="noopener noreferrer"
          >
            {downloadLabel}
          </a>
        </li>
      ))}
    </ul>
  );
}
