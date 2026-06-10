import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
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
    namespace: "content.investmentProjects.meta",
  });
  return {
    title: t("title"),
    description: t("description"),
    openGraph: { title: t("title"), description: t("description") },
  };
}

export default async function InvestmentProjectsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "content" });
  const tI = await getTranslations({
    locale,
    namespace: "content.investmentProjects",
  });

  const stats = tI.raw("stats") as Array<{
    value: string;
    label: string;
  }>;

  const stages = tI.raw("stages") as Array<{
    number: string;
    title: string;
    items: string[];
  }>;

  return (
    <ContentPage
      title={tI("title")}
      subtitle={tI("subtitle")}
      imageSlug="investment-projects"
      breadcrumbs={[
        { label: t("breadcrumbs.home"), href: `/${locale}` },
        { label: tI("title") },
      ]}
    >
      {/* Крупные статистические показатели */}
      <ContentSection>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 mb-6">
          {stats.map((stat, i) => (
            <div
              key={i}
              className="rounded-[var(--radius)] bg-[var(--primary)] p-6 text-center text-white"
            >
              <div className="font-display text-3xl font-bold text-[var(--accent)] sm:text-4xl">
                {stat.value}
              </div>
              <div className="mt-2 text-sm text-white/80">{stat.label}</div>
            </div>
          ))}
        </div>
        <p className="text-[var(--text-2)] leading-relaxed">
          {tI("description")}
        </p>
      </ContentSection>

      {/* Двухэтапная процедура */}
      <ContentSection title={tI("procedureTitle")}>
        <p className="text-[var(--text-2)] mb-6 leading-relaxed">
          {tI("procedureDescription")}
        </p>
        <CardGrid cols={2}>
          {stages.map((stage, i) => (
            <ContentCard key={i}>
              <div className="mb-3 flex items-center gap-3">
                <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[var(--primary)] text-white font-bold">
                  {stage.number}
                </span>
                <h3 className="font-semibold text-[var(--text)]">
                  {stage.title}
                </h3>
              </div>
              <ul className="space-y-2">
                {stage.items.map((item, j) => (
                  <li key={j} className="flex items-start gap-2">
                    <span
                      className="mt-1.5 h-1.5 w-1.5 rounded-full bg-[var(--primary)] flex-shrink-0"
                      aria-hidden="true"
                    />
                    <span className="text-sm text-[var(--text-2)]">{item}</span>
                  </li>
                ))}
              </ul>
            </ContentCard>
          ))}
        </CardGrid>
      </ContentSection>

      {/* Направления финансирования */}
      <ContentSection title={tI("directionsTitle")}>
        <p className="text-[var(--text-2)] mb-4 leading-relaxed">
          {tI("directionsDescription")}
        </p>
      </ContentSection>

      {/* CTA */}
      <div className="rounded-[var(--radius)] bg-[var(--primary)] p-8 text-center text-white">
        <h2 className="font-display text-xl font-bold mb-2">
          {tI("ctaTitle")}
        </h2>
        <p className="text-white/80 mb-6 text-sm leading-relaxed">
          {tI("ctaDescription")}
        </p>
        <Link
          href={`/${locale}`}
          className="inline-flex items-center gap-2 rounded-[var(--radius)] bg-[var(--accent)] px-6 py-3 text-sm font-bold text-white hover:bg-[var(--accent-2)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
        >
          {tI("ctaButton")}
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
    </ContentPage>
  );
}
