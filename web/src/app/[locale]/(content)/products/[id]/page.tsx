import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { routing } from '@/i18n/routing';
import { ContentPage, AccordionItem } from '@/components/content/content-page';
import { ProductTabs, type ProductTab } from '@/components/products/product-tabs';
import { ProductCalculator } from '@/components/products/product-calculator';
import { PROGRAMS, PROGRAM_DETAILS, type Program } from '@/data/programs';
import { getBrochure } from '@/data/brochures';
import { getChecklist } from '@/data/loan-documents';
import { getProgramFaq } from '@/data/program-faq';
import { getProgramRequirements } from '@/data/program-requirements';
import { fmtAmount } from '@/lib/format';

// Только видимые программы (скрытая «Кең дала» исключена). dynamicParams=false →
// прямой заход на /products/ken_dala отдаёт 404.
export const dynamicParams = false;

export async function generateStaticParams() {
  return routing.locales.flatMap((locale) =>
    PROGRAMS.filter((p) => !p.hidden).map((p) => ({ locale, id: p.id })),
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}): Promise<Metadata> {
  const { locale, id } = await params;
  const program = PROGRAMS.find((p) => p.id === id);
  if (!program) return {};
  const tp = await getTranslations({ locale, namespace: 'content.products' });
  const title = tp('detail.metaTitle', { program: program.title });
  const description = tp('detail.metaDescription', { program: program.title });
  return { title, description, openGraph: { title, description } };
}

// --- мелкие чистые помощники отображения ---
function ruYearForm(n: number): 'yearOne' | 'yearFew' | 'yearMany' {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return 'yearOne';
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return 'yearFew';
  return 'yearMany';
}
function formatTerm(months: number, tProg: (k: string) => string): string {
  if (months >= 24 && months % 12 === 0) {
    const years = months / 12;
    return `${years} ${tProg(ruYearForm(years))}`;
  }
  return `${months} ${tProg('months')}`;
}
function displayRate(p: Program): string {
  return p.rateRange ?? `${String(p.rate).replace('.', ',')}%`;
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const program = PROGRAMS.find((p) => p.id === id);
  // Скрытые программы (напр. «Кең дала») в раздел продуктов не входят → 404.
  if (!program || program.hidden) notFound();

  const t = await getTranslations({ locale, namespace: 'content' });
  const tp = await getTranslations({ locale, namespace: 'content.products' });
  const tProg = await getTranslations({ locale, namespace: 'funnel.programs' });

  const d = PROGRAM_DETAILS[id]; // может отсутствовать (напр. «Кең дала»)
  const checklist = getChecklist(id);
  const brochure = getBrochure(id, locale); // официальная листовка или null
  const isKk = locale === 'kk';

  // Параметры-полоска (ставка / сумма / срок)
  const ParamStrip = (
    <div className="mb-6 grid grid-cols-3 gap-3 rounded-[var(--radius)] bg-[var(--surface-warm)] p-5">
      <div>
        <div className="text-[11px] uppercase tracking-wide text-[var(--text-3)] sm:text-xs">{tProg('rate')}</div>
        <div className="mt-1 text-xl font-bold leading-tight text-[var(--primary)] sm:text-2xl md:text-3xl">{displayRate(program)}</div>
      </div>
      <div>
        <div className="text-[11px] uppercase tracking-wide text-[var(--text-3)] sm:text-xs">{tProg('amountUpTo')}</div>
        <div className="mt-1 text-xl font-bold leading-tight text-[var(--primary)] sm:text-2xl md:text-3xl">{fmtAmount(program.maxAmount)}</div>
      </div>
      <div>
        <div className="text-[11px] uppercase tracking-wide text-[var(--text-3)] sm:text-xs">{tProg('termUpTo')}</div>
        <div className="mt-1 text-xl font-bold leading-tight text-[var(--primary)] sm:text-2xl md:text-3xl">{formatTerm(program.maxTerm, tProg)}</div>
      </div>
    </div>
  );

  // --- 1. Условия ---
  const conditions = (
    <div className="space-y-6">
      {ParamStrip}
      <p className="text-[var(--text-2)] leading-relaxed">{d?.summary ?? program.description}</p>

      {d?.spend && d.spend.length > 0 && (
        <div>
          <h3 className="mb-2 font-display text-base font-semibold text-[var(--text)]">{tp('whatForTitle')}</h3>
          <ul className="list-disc space-y-1.5 pl-5 text-sm text-[var(--text-2)]">
            {d.spend.map((s, i) => <li key={i}>{s}</li>)}
          </ul>
        </div>
      )}

      <div>
        <h3 className="mb-2 font-display text-base font-semibold text-[var(--text)]">{tProg('repaymentTitle')}</h3>
        <p className="text-sm leading-relaxed text-[var(--text-2)]">
          {d?.repayment ?? program.scheduleNote ?? program.rateNote}
        </p>
      </div>

      {d?.notFinanced && d.notFinanced.length > 0 && (
        <div>
          <h3 className="mb-2 font-display text-base font-semibold text-[var(--text)]">{tProg('notFinancedTitle')}</h3>
          <ul className="list-disc space-y-1.5 pl-5 text-sm text-[var(--text-2)]">
            {d.notFinanced.map((s, i) => <li key={i}>{s}</li>)}
          </ul>
        </div>
      )}

      {(d ? d.note : program.rateNote) && (
        <div className="rounded-[var(--radius)] border border-[var(--accent-soft)] bg-[var(--accent-soft)] px-4 py-3 text-sm leading-relaxed text-[var(--text-2)]">
          <strong className="text-[var(--text)]">{tProg('noteLabel')} </strong>
          {d ? d.note : program.rateNote}
        </div>
      )}
    </div>
  );

  // --- 2. Требования (развёрнуто из регламента: заёмщик / проект / особые условия) ---
  const reqGroups = getProgramRequirements(id);
  const requirements = (
    <div className="space-y-6">
      {reqGroups.length > 0 ? (
        reqGroups.map((g) => (
          <div key={g.title}>
            <h3 className="mb-3 font-display text-base font-semibold text-[var(--primary)]">{g.title}</h3>
            <ul className="list-disc space-y-2 pl-5 text-sm text-[var(--text-2)]">
              {g.items.map((s, i) => <li key={i}>{s}</li>)}
            </ul>
          </div>
        ))
      ) : d?.requirements && d.requirements.length > 0 ? (
        <ul className="list-disc space-y-2 pl-5 text-sm text-[var(--text-2)]">
          {d.requirements.map((s, i) => <li key={i}>{s}</li>)}
        </ul>
      ) : (
        <p className="text-sm leading-relaxed text-[var(--text-2)]">{tp('indirectNote')}</p>
      )}
    </div>
  );

  // --- 3. Документы ---
  const documents = (
    <div className="space-y-6">
      {checklist.map((cat) => (
        <div key={cat.key}>
          <h3 className="mb-3 font-display text-base font-semibold text-[var(--primary)]">
            {isKk ? cat.titleKk : cat.title}
          </h3>
          <ul className="space-y-2">
            {cat.items.map((item) => (
              <li key={item.key} className="flex items-start gap-3 text-sm text-[var(--text-2)]">
                <span
                  className={`mt-0.5 inline-flex flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                    item.required
                      ? 'bg-[var(--primary-soft)] text-[var(--primary)]'
                      : 'bg-[var(--bg-tint)] text-[var(--text-3)]'
                  }`}
                >
                  {item.required ? tp('docsRequired') : tp('docsOptional')}
                </span>
                <span>{isKk ? item.titleKk : item.title}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
      <p className="text-sm text-[var(--text-3)]">{tp('docsNote')}</p>
    </div>
  );

  // --- 4. Вопросы (Q&A, специфичные для программы) ---
  const programFaq = getProgramFaq(id);
  const faq = (
    <div className="space-y-5">
      {programFaq.length > 0 ? (
        <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-5 divide-y divide-[var(--border-soft)] shadow-[var(--shadow-sm)]">
          {programFaq.map((item, i) => (
            <AccordionItem key={i} question={item.q} answer={item.a} />
          ))}
        </div>
      ) : (
        <p className="text-sm leading-relaxed text-[var(--text-2)]">{tp('faqNote')}</p>
      )}
      <Link
        href={`/${locale}/faq`}
        className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--primary)] hover:underline"
      >
        {tp('faqLink')}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path d="M9 18l6-6-6-6" />
        </svg>
      </Link>
    </div>
  );

  const tabs: ProductTab[] = [
    { id: 'conditions', label: tp('tabs.conditions'), content: conditions },
    { id: 'requirements', label: tp('tabs.requirements'), content: requirements },
    { id: 'documents', label: tp('tabs.documents'), content: documents },
    { id: 'faq', label: tp('tabs.faq'), content: faq },
  ];

  return (
    <ContentPage
      title={program.title}
      subtitle={program.description}
      eyebrow={program.category}
      breadcrumbs={[
        { label: t('breadcrumbs.home'), href: `/${locale}` },
        { label: tp('title'), href: `/${locale}/products` },
        { label: program.title },
      ]}
    >
      <ProductTabs tabs={tabs} />

      {/* Брошюра программы (официальная листовка АКК): превью + скачивание PDF */}
      {brochure && (
        <section className="mt-10 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-sm)]">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-display text-xl font-bold text-[var(--text)]">{tp('brochure.title')}</h2>
              <p className="mt-1 text-sm text-[var(--text-2)]">{tp('brochure.lede')}</p>
            </div>
            <a
              href={brochure.pdf}
              download
              className="inline-flex flex-shrink-0 items-center gap-2 rounded-[var(--radius)] bg-[var(--primary)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--primary-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
              </svg>
              {tp('brochure.download')}
            </a>
          </div>
          {/* Превью обрезано по верху листовки (логотип/заголовок) и ограничено
              по высоте — полный лист A4 растягивал страницу. Полная версия — по
              клику (PDF). Снизу — плавное затухание + подсказка «Открыть PDF». */}
          <a
            href={brochure.pdf}
            target="_blank"
            rel="noopener noreferrer"
            title={tp('brochure.openHint')}
            className="group relative block overflow-hidden rounded-[var(--radius)] border border-[var(--border-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={brochure.preview}
              alt={tp('brochure.alt', { program: program.title })}
              loading="lazy"
              className="max-h-[300px] w-full object-cover object-top transition-transform duration-300 group-hover:scale-[1.01]"
            />
            {/* Затухание к фону карточки — намёк, что лист продолжается */}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[var(--surface)] to-transparent"
            />
            <span className="absolute bottom-3 left-1/2 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-[var(--surface)] px-3.5 py-1.5 text-xs font-semibold text-[var(--primary)] shadow-[var(--shadow)] ring-1 ring-[var(--border)]">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              {tp('brochure.openHint')}
            </span>
          </a>
        </section>
      )}

      {/* Калькулятор платежа (публичный pre-screen) */}
      <section
        id="calc"
        className="mt-10 scroll-mt-24 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-sm)]"
      >
        <h2 className="font-display text-xl font-bold text-[var(--text)]">{tp('calcTitle')}</h2>
        <ProductCalculator program={program} />
      </section>

      {/* CTA-блок */}
      <div className="mt-10 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-sm)]">
        {program.indirectOnly ? (
          <>
            <p className="mb-4 text-sm leading-relaxed text-[var(--text-2)]">{tp('indirectNote')}</p>
            <div className="flex flex-wrap gap-3">
              <Link
                href={`/${locale}/contacts`}
                className="inline-flex items-center justify-center rounded-[var(--radius)] bg-[var(--primary)] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[var(--primary-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
              >
                {tp('findKt')}
              </Link>
              <Link
                href={`/${locale}?consult=1`}
                className="inline-flex items-center justify-center rounded-[var(--radius)] border border-[var(--primary)] px-6 py-3 text-sm font-semibold text-[var(--primary)] transition hover:bg-[var(--primary)] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
              >
                {tp('consultCta')}
              </Link>
            </div>
          </>
        ) : (
          <div className="flex flex-wrap gap-3">
            <Link
              href={`/${locale}?apply=${program.id}`}
              className="inline-flex items-center justify-center rounded-[var(--radius)] bg-[var(--primary)] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[var(--primary-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
            >
              {tp('applyCta')}
            </Link>
            <Link
              href={`/${locale}?consult=1`}
              className="inline-flex items-center justify-center rounded-[var(--radius)] border border-[var(--primary)] px-6 py-3 text-sm font-semibold text-[var(--primary)] transition hover:bg-[var(--primary)] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
            >
              {tp('consultCta')}
            </Link>
          </div>
        )}
      </div>

      {/* Не знаете, какая программа подходит? → отправляем в подбор (квиз) на главной */}
      <div className="mt-6 flex flex-col items-start gap-3 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-warm)] p-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-medium text-[var(--text-2)]">{tp('notSureTitle')}</p>
        <Link
          href={`/${locale}?quiz=1`}
          className="inline-flex h-11 flex-shrink-0 items-center justify-center rounded-[var(--radius)] border border-[var(--primary)] px-5 text-sm font-semibold text-[var(--primary)] transition hover:bg-[var(--primary)] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
        >
          {tp('notSureCta')}
        </Link>
      </div>

      <div className="mt-6">
        <Link
          href={`/${locale}/products`}
          className="inline-flex items-center gap-1 text-sm font-medium text-[var(--text-3)] hover:text-[var(--primary)]"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          {tp('backToCatalog')}
        </Link>
      </div>
    </ContentPage>
  );
}
