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
    namespace: "content.sustainability.meta",
  });
  return {
    title: t("title"),
    description: t("description"),
    openGraph: { title: t("title"), description: t("description") },
  };
}

export default async function SustainabilityPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "content" });
  const tS = await getTranslations({
    locale,
    namespace: "content.sustainability",
  });

  const pillars = tS.raw("pillars") as Array<{
    title: string;
    description: string;
    icon: string;
  }>;

  const commitments = tS.raw("commitments") as string[];
  const objectives = tS.raw("objectives") as string[];
  const documents = tS.raw("documents") as Array<{
    title: string;
    url: string;
    meta?: string;
  }>;

  // Иконки трёх составляющих УР (экономическая · социальная · экологическая) —
  // SVG вместо эмодзи, по дизайн-коду платформы.
  const PILLAR_ICONS = [
    <svg key="econ" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
      <path d="M3 3v18h18" />
      <path d="M7 14l4-4 3 3 5-6" />
    </svg>,
    <svg key="soc" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>,
    <svg key="env" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
      <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
      <path d="M2 22c1.5-2 3-3.5 5-5" />
    </svg>,
  ];

  return (
    <ContentPage
      title={tS("title")}
      subtitle={tS("subtitle")}
      imageSlug="sustainability"
      breadcrumbs={[
        { label: t("breadcrumbs.home"), href: `/${locale}` },
        { label: tS("title") },
      ]}
    >
      {/* 3 составляющие устойчивого развития */}
      <ContentSection title={tS("pillarsTitle")}>
        <p className="text-[var(--text-2)] mb-6 leading-relaxed">
          {tS("pillarsDescription")}
        </p>
        <CardGrid cols={3}>
          {pillars.map((pillar, i) => (
            <ContentCard key={i}>
              <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-[var(--primary-soft)] text-[var(--primary)]">
                {PILLAR_ICONS[i] ?? PILLAR_ICONS[0]}
              </div>
              <h3 className="font-semibold text-[var(--text)] mb-2">
                {pillar.title}
              </h3>
              <p className="text-sm text-[var(--text-2)] leading-relaxed">
                {pillar.description}
              </p>
            </ContentCard>
          ))}
        </CardGrid>
      </ContentSection>

      {/* Обязательства */}
      <ContentSection title={tS("commitmentsTitle")}>
        <p className="text-[var(--text-2)] mb-4 leading-relaxed">
          {tS("commitmentsDescription")}
        </p>
        <ul className="space-y-3">
          {commitments.map((item, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="mt-1 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-[var(--primary)] text-white text-[10px] font-bold">
                {i + 1}
              </span>
              <span className="text-[var(--text-2)]">{item}</span>
            </li>
          ))}
        </ul>
      </ContentSection>

      {/* Задачи */}
      <ContentSection title={tS("objectivesTitle")}>
        <div className="grid gap-3 sm:grid-cols-2">
          {objectives.map((obj, i) => (
            <ContentCard key={i} className="flex items-start gap-3">
              <span
                className="mt-0.5 flex-shrink-0 text-[var(--accent)]"
                aria-hidden="true"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </span>
              <span className="text-sm text-[var(--text-2)]">{obj}</span>
            </ContentCard>
          ))}
        </div>
      </ContentSection>

      {/* Международные стандарты */}
      <ContentSection title={tS("standardsTitle")}>
        <ContentCard>
          <p className="text-[var(--text-2)] leading-relaxed mb-3">
            {tS("standardsDescription")}
          </p>
          <div className="flex flex-wrap gap-2 mt-2">
            {(tS.raw("standardsTags") as string[]).map((tag, i) => (
              <span
                key={i}
                className="rounded-full border border-[var(--primary-soft)] bg-[var(--primary-soft)] px-3 py-1 text-xs font-medium text-[var(--primary)]"
              >
                {tag}
              </span>
            ))}
          </div>
        </ContentCard>
      </ContentSection>

      {/* Документ политики */}
      <ContentSection title={tS("documentsTitle")}>
        <DocumentList
          items={documents}
          downloadLabel={tS("downloadLabel")}
        />
      </ContentSection>
    </ContentPage>
  );
}
