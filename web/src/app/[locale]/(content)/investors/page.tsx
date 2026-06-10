import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { routing } from "@/i18n/routing";
import {
  ContentPage,
  ContentSection,
  CardGrid,
  ContentCard,
  DocumentList,
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
  const t = await getTranslations({
    locale,
    namespace: "content.investors.meta",
  });
  return {
    title: t("title"),
    description: t("description"),
    openGraph: { title: t("title"), description: t("description") },
  };
}

export default async function InvestorsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "content" });
  const tI = await getTranslations({ locale, namespace: "content.investors" });

  const ratingItems = tI.raw("ratings.items") as Array<{
    agency: string;
    rating: string;
    outlook: string;
    date: string;
    url: string;
  }>;
  const disclosureItems = tI.raw("disclosure.items") as Array<{
    title: string;
    url: string;
  }>;

  return (
    <ContentPage
      title={tI("title")}
      imageSlug="investors"
      breadcrumbs={[
        { label: t("breadcrumbs.home"), href: `/${locale}` },
        { label: tI("title") },
      ]}
    >
      {/* Кредитные рейтинги */}
      <ContentSection title={tI("ratings.title")}>
        <p className="text-[var(--text-2)] mb-5 leading-relaxed">
          {tI("ratings.description")}
        </p>
        <CardGrid cols={3}>
          {ratingItems.map((item, i) => (
            <ContentCard key={i}>
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-3)] mb-2">
                {item.agency}
              </p>
              <p className="font-display text-2xl font-bold text-[var(--primary)]">
                {item.rating}
              </p>
              <p className="text-sm text-[var(--text-2)] mt-1">
                {item.outlook}
              </p>
              <p className="text-xs text-[var(--text-3)] mt-2">{item.date}</p>
              {item.url !== "#TODO" && (
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-block text-xs text-[var(--primary)] hover:underline"
                >
                  {tI("readMoreLabel")}
                </a>
              )}
            </ContentCard>
          ))}
        </CardGrid>
      </ContentSection>

      {/* Облигации */}
      <ContentSection title={tI("bonds.title")}>
        <p className="text-[var(--text-2)] mb-4 leading-relaxed">
          {tI("bonds.description")}
        </p>
        <a
          href={tI("bonds.kaseLink")}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-[var(--radius)] bg-[var(--primary-soft)] px-4 py-2.5 text-sm font-semibold text-[var(--primary)] hover:bg-[var(--primary)] hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
          </svg>
          {tI("bonds.kaseLinkLabel")}
        </a>
      </ContentSection>

      {/* Раскрытие информации */}
      <ContentSection title={tI("disclosure.title")}>
        <p className="text-[var(--text-2)] mb-5 leading-relaxed">
          {tI("disclosure.description")}
        </p>
        <DocumentList
          downloadLabel={tI("goToLabel")}
          items={disclosureItems.map((item) => ({
            title: item.title,
            url: item.url,
          }))}
        />
      </ContentSection>
    </ContentPage>
  );
}
