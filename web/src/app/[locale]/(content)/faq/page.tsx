import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { routing } from "@/i18n/routing";
import {
  ContentPage,
  ContentSection,
  AccordionItem,
} from "@/components/content/content-page";

export async function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "content.faq.meta" });
  return {
    title: t("title"),
    description: t("description"),
    openGraph: { title: t("title"), description: t("description") },
  };
}

export default async function FaqPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "content" });
  const tF = await getTranslations({ locale, namespace: "content.faq" });

  const items = tF.raw("items") as Array<{ q: string; a: string }>;

  return (
    <ContentPage
      title={tF("title")}
      subtitle={tF("subtitle")}
      imageSlug="faq"
      breadcrumbs={[
        { label: t("breadcrumbs.home"), href: `/${locale}` },
        { label: tF("title") },
      ]}
    >
      <ContentSection>
        <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-5 divide-y divide-[var(--border-soft)] shadow-[var(--shadow-sm)]">
          {items.map((item, i) => (
            <AccordionItem key={i} question={item.q} answer={item.a} />
          ))}
        </div>

        {/* CTA внизу */}
        <div className="mt-8 rounded-[var(--radius)] bg-[var(--primary-soft)] p-6 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1">
            <p className="font-semibold text-[var(--primary)]">
              Не нашли ответ?
            </p>
            <p className="text-sm text-[var(--text-2)] mt-1">
              Позвоните на бесплатный колл-центр или напишите нам.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <a
              href="tel:1408"
              className="inline-flex items-center gap-2 rounded-[var(--radius-sm)] bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--primary-2)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
              1408
            </a>
            <a
              href="mailto:info@agrocredit.kz"
              className="inline-flex items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--primary)] px-4 py-2 text-sm font-semibold text-[var(--primary)] hover:bg-[var(--primary)] hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
            >
              info@agrocredit.kz
            </a>
          </div>
        </div>
      </ContentSection>
    </ContentPage>
  );
}
