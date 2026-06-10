import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { routing } from "@/i18n/routing";
import {
  ContentPage,
  ContentSection,
  CardGrid,
  ContentCard,
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
    namespace: "content.careers.meta",
  });
  return {
    title: t("title"),
    description: t("description"),
    openGraph: { title: t("title"), description: t("description") },
  };
}

export default async function CareersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "content" });
  const tC = await getTranslations({ locale, namespace: "content.careers" });

  const whyItems = tC.raw("whyItems") as Array<{
    title: string;
    text: string;
  }>;

  // Иконки для карточек "Почему АКК?"
  const icons = [
    // Социальная миссия — сердце
    <svg key="0" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>,
    // Профессиональный рост — звезда
    <svg key="1" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>,
    // Стабильность — щит
    <svg key="2" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>,
    // 16 регионов — карта
    <svg key="3" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" /><line x1="8" y1="2" x2="8" y2="18" /><line x1="16" y1="6" x2="16" y2="22" /></svg>,
  ];

  return (
    <ContentPage
      title={tC("title")}
      subtitle={tC("subtitle")}
      imageSlug="careers"
      breadcrumbs={[
        { label: t("breadcrumbs.home"), href: `/${locale}` },
        { label: tC("title") },
      ]}
    >
      {/* Описание */}
      <ContentSection>
        <p className="text-[var(--text-2)] text-base leading-relaxed">
          {tC("description")}
        </p>
      </ContentSection>

      {/* Почему АКК? */}
      <ContentSection title={tC("whyTitle")}>
        <CardGrid cols={2}>
          {whyItems.map((item, i) => (
            <ContentCard key={i} className="flex gap-4">
              <span className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[var(--primary-soft)] text-[var(--primary)]">
                {icons[i]}
              </span>
              <div>
                <h3 className="font-semibold text-[var(--text)] mb-1">
                  {item.title}
                </h3>
                <p className="text-sm text-[var(--text-2)] leading-relaxed">
                  {item.text}
                </p>
              </div>
            </ContentCard>
          ))}
        </CardGrid>
      </ContentSection>

      {/* Открытые вакансии */}
      <ContentSection title={tC("openPositionsTitle")}>
        <p className="text-[var(--text-2)] mb-5 leading-relaxed">
          {tC("openPositionsNote")}
        </p>

        <div className="flex flex-wrap gap-3">
          <a
            href={tC("hhLink")}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-[var(--radius)] bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[var(--primary-2)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
          >
            {tC("hhLinkLabel")}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          </a>
          <a
            href={tC("akkLink")}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-[var(--radius)] border border-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-[var(--primary)] hover:bg-[var(--primary-soft)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
          >
            {tC("akkLinkLabel")}
          </a>
        </div>

        {/* Контакт HR */}
        <div className="mt-6 rounded-[var(--radius)] bg-[var(--primary-soft)] p-4 flex items-center gap-4">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" aria-hidden="true" className="flex-shrink-0">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
            <polyline points="22,6 12,13 2,6" />
          </svg>
          <div>
            <p className="text-sm text-[var(--text-2)]">{tC("contactNote")}</p>
            <a
              href={`mailto:${tC("contactEmail")}`}
              className="text-sm font-semibold text-[var(--primary)] hover:underline"
            >
              {tC("contactEmail")}
            </a>
          </div>
        </div>
      </ContentSection>
    </ContentPage>
  );
}
