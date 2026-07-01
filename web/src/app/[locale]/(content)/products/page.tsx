import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { routing } from '@/i18n/routing';
import { ContentPage } from '@/components/content/content-page';
import { ProductCardMedia } from '@/components/products/product-card-media';
import { PROGRAMS, type Program } from '@/data/programs';
import { fmtAmount } from '@/lib/format';

export async function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'content.products.meta' });
  return {
    title: t('title'),
    description: t('description'),
    openGraph: { title: t('title'), description: t('description') },
  };
}

// Срок: целые годы (≥24 мес, кратно 12) — в годах, иначе в месяцах
// (как formatTerm воронки — фермеры путались в «144 мес»).
function ruYearForm(n: number): 'yearOne' | 'yearFew' | 'yearMany' {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return 'yearOne';
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return 'yearFew';
  return 'yearMany';
}
function formatTerm(months: number, tp: (k: string) => string): string {
  if (months >= 24 && months % 12 === 0) {
    const years = months / 12;
    return `${years} ${tp(ruYearForm(years))}`;
  }
  return `${months} ${tp('months')}`;
}

// Ставка для отображения: текстовый диапазон (rateRange) приоритетнее числа.
function displayRate(p: Program): string {
  return p.rateRange ?? `${String(p.rate).replace('.', ',')}%`;
}

function ProductCard({
  p,
  locale,
  tp,
  tProg,
}: {
  p: Program;
  locale: string;
  tp: (k: string) => string;
  tProg: (k: string) => string;
}) {
  return (
    <div
      className={`group relative flex flex-col overflow-hidden rounded-[var(--radius-lg)] border bg-[var(--surface)] p-5 shadow-[var(--shadow-sm)] transition hover:-translate-y-0.5 hover:shadow-lg ${
        p.featured ? 'border-[var(--primary)]' : 'border-[var(--border)]'
      }`}
    >
      {/* Фото + hover-видео программы (фолбэк — зелёный градиент, если файла нет) */}
      <ProductCardMedia id={p.id} category={p.category} />
      {p.indirectOnly && (
        <span className="mb-2 inline-flex w-fit rounded-full bg-[var(--accent-soft)] px-2.5 py-1 text-[11px] font-medium text-[var(--accent-2)]">
          {tProg('indirectBadge')}
        </span>
      )}
      {/* Заголовок-ссылка на детальную — растянут на всю карточку (stretched link) */}
      <h3 className="mb-1.5 font-display text-lg font-bold text-[var(--text)]">
        <Link
          href={`/${locale}/products/${p.id}`}
          className="rounded before:absolute before:inset-0 before:content-[''] hover:text-[var(--primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
        >
          {p.title}
        </Link>
      </h3>
      <p className="mb-4 flex-1 text-sm leading-relaxed text-[var(--text-2)]">{p.description}</p>
      <dl className="space-y-1.5 border-t border-[var(--border-soft)] pt-3 text-sm">
        <div className="flex justify-between gap-3">
          <dt className="text-[var(--text-3)]">{tProg('rate')}</dt>
          <dd className="text-right font-semibold text-[var(--text)]">{displayRate(p)}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-[var(--text-3)]">{tProg('amountUpTo')}</dt>
          <dd className="text-right font-semibold text-[var(--text)]">{fmtAmount(p.maxAmount)}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-[var(--text-3)]">{tProg('termUpTo')}</dt>
          <dd className="text-right font-semibold text-[var(--text)]">{formatTerm(p.maxTerm, tProg)}</dd>
        </div>
      </dl>
      {/* Действия: «Подробнее» (вся карточка) + отдельная кнопка расчёта (→ #calc) */}
      <div className="mt-4 flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--primary)]">
          {tp('detailCta')}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true" className="transition-transform group-hover:translate-x-0.5">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </span>
        <Link
          href={`/${locale}/products/${p.id}#calc`}
          className="relative z-10 inline-flex items-center rounded-[var(--radius-sm)] border border-[var(--primary)] px-3 py-1.5 text-xs font-semibold text-[var(--primary)] transition hover:bg-[var(--primary)] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
        >
          {tp('calcCta')}
        </Link>
      </div>
    </div>
  );
}

export default async function ProductsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'content' });
  const tp = await getTranslations({ locale, namespace: 'content.products' });
  const tProg = await getTranslations({ locale, namespace: 'funnel.programs' });

  // Каталог продуктов: 9 программ (скрытая «Кең дала» убрана по решению владельца).
  // featured — первой; Аквакультура/Жайлау/тепличные хозяйства — из регламента.
  const visible = PROGRAMS.filter((p) => !p.hidden);
  const ordered = [...visible.filter((p) => p.featured), ...visible.filter((p) => !p.featured)];

  return (
    <ContentPage
      title={tp('title')}
      subtitle={tp('subtitle')}
      eyebrow={tp('eyebrow')}
      breadcrumbs={[
        { label: t('breadcrumbs.home'), href: `/${locale}` },
        { label: tp('title') },
      ]}
    >
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-2xl text-[var(--text-2)]">{tp('lede')}</p>
        <Link
          href={`/${locale}?quiz=1`}
          className="inline-flex flex-shrink-0 items-center justify-center rounded-[var(--radius)] bg-[var(--primary)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--primary-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
        >
          {tp('quizCta')}
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {ordered.map((p) => (
          <ProductCard key={p.id} p={p} locale={locale} tp={tp} tProg={tProg} />
        ))}
      </div>

      {/* Завершающий блок подбора: не знаете, какая программа подходит → квиз */}
      <div className="mt-10 flex flex-col items-start gap-3 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-warm)] p-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-medium text-[var(--text-2)]">{tp('notSureTitle')}</p>
        <Link
          href={`/${locale}?quiz=1`}
          className="inline-flex h-11 flex-shrink-0 items-center justify-center rounded-[var(--radius)] border border-[var(--primary)] px-5 text-sm font-semibold text-[var(--primary)] transition hover:bg-[var(--primary)] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
        >
          {tp('notSureCta')}
        </Link>
      </div>
    </ContentPage>
  );
}
