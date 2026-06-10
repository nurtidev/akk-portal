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
              <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-[var(--primary-soft)] text-[var(--primary)] text-xl">
                {pillar.icon}
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
