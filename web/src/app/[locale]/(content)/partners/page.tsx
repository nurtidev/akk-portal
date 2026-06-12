import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { routing } from "@/i18n/routing";
import {
  ContentPage,
  ContentSection,
  CardGrid,
  ContentCard,
  Prose,
} from "@/components/content/content-page";
import { PartnerProfilePreview } from "@/components/content/partner-profile-preview";

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
    namespace: "content.partners.meta",
  });
  return {
    title: t("title"),
    description: t("description"),
    openGraph: { title: t("title"), description: t("description") },
  };
}

export default async function PartnersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "content" });
  const tP = await getTranslations({ locale, namespace: "content.partners" });

  const dataFactors = tP.raw("dataFactors") as Array<{
    title: string;
    description: string;
  }>;

  const steps = tP.raw("steps") as Array<{
    title: string;
    description: string;
  }>;

  const benefits = tP.raw("benefits") as Array<{
    title: string;
    items: string[];
  }>;

  return (
    <ContentPage
      title={tP("title")}
      subtitle={tP("subtitle")}
      eyebrow={tP("eyebrow")}
      imageSlug="partners"
      breadcrumbs={[
        { label: t("breadcrumbs.home"), href: `/${locale}` },
        { label: tP("title") },
      ]}
    >
      {/* 1. Проблема → Решение */}
      <ContentSection>
        <CardGrid cols={2}>
          {/* Проблема */}
          <ContentCard>
            <div className="mb-3">
              <span className="inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold bg-[var(--danger-soft)] text-[var(--danger)]">
                {tP("problemBadge")}
              </span>
            </div>
            <h2 className="font-display font-semibold text-[var(--text)] text-base mb-2">
              {tP("problemTitle")}
            </h2>
            <p className="text-sm text-[var(--text-2)] leading-relaxed">
              {tP("problemText")}
            </p>
          </ContentCard>

          {/* Решение */}
          <ContentCard>
            <div className="mb-3">
              <span className="inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold bg-[var(--primary-soft)] text-[var(--primary)]">
                {tP("solutionBadge")}
              </span>
            </div>
            <h2 className="font-display font-semibold text-[var(--text)] text-base mb-2">
              {tP("solutionTitle")}
            </h2>
            <p className="text-sm text-[var(--text-2)] leading-relaxed">
              {tP("solutionText")}
            </p>
          </ContentCard>
        </CardGrid>
      </ContentSection>

      {/* 2. Уникальность данных */}
      <ContentSection title={tP("uniqueDataTitle")}>
        <p className="text-[var(--text-2)] mb-6 leading-relaxed">
          {tP("uniqueDataDescription")}
        </p>
        <CardGrid cols={3}>
          {dataFactors.map((factor, i) => (
            <ContentCard key={i}>
              <div className="flex items-start gap-2 mb-1">
                <span
                  className="inline-block w-2 h-2 rounded-full bg-[var(--accent)] mt-1.5 flex-shrink-0"
                  aria-hidden="true"
                />
                <h3 className="font-semibold text-[var(--primary)] text-sm">
                  {factor.title}
                </h3>
              </div>
              <p className="text-sm text-[var(--text-2)] leading-relaxed pl-4">
                {factor.description}
              </p>
            </ContentCard>
          ))}
        </CardGrid>
      </ContentSection>

      {/* 3. Как это работает — таймлайн */}
      <ContentSection title={tP("howWorksTitle")}>
        <ol className="relative space-y-0">
          {steps.map((step, i) => (
            <li key={i} className="relative flex gap-5 pb-8 last:pb-0">
              {/* Линия таймлайна */}
              {i < steps.length - 1 && (
                <div
                  className="absolute left-[19px] top-10 bottom-0 w-0.5 bg-[var(--primary-soft)]"
                  aria-hidden="true"
                />
              )}
              {/* Номер шага */}
              <div className="relative z-10 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[var(--primary)] text-white font-bold text-sm shadow-[0_0_0_4px_var(--primary-soft)]">
                {i + 1}
              </div>
              {/* Содержимое */}
              <div className="flex-1 pt-1.5 pb-6">
                <h3 className="font-semibold text-[var(--text)] mb-1">
                  {step.title}
                </h3>
                <p className="text-sm text-[var(--text-2)] leading-relaxed">
                  {step.description}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </ContentSection>

      {/* 4. Превью профиля — client component */}
      <ContentSection title={tP("previewTitle")}>
        <p className="text-[var(--text-2)] mb-6 leading-relaxed">
          {tP("previewDescription")}
        </p>
        <div className="max-w-md">
          <PartnerProfilePreview />
        </div>
      </ContentSection>

      {/* 5. Выгоды трём сторонам */}
      <ContentSection title={tP("benefitsTitle")}>
        <CardGrid cols={3}>
          {benefits.map((benefit, i) => (
            <ContentCard key={i}>
              <h3 className="font-semibold text-[var(--primary)] mb-3 text-sm">
                {benefit.title}
              </h3>
              <ul className="flex flex-col gap-1.5">
                {benefit.items.map((item, j) => (
                  <li key={j} className="flex items-start gap-2 text-sm text-[var(--text-2)]">
                    <span
                      className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--accent)] mt-1.5 flex-shrink-0"
                      aria-hidden="true"
                    />
                    {item}
                  </li>
                ))}
              </ul>
            </ContentCard>
          ))}
        </CardGrid>
      </ContentSection>

      {/* 6. Правовая рамка */}
      <ContentSection title={tP("legalTitle")}>
        <ContentCard>
          <Prose>
            <p>{tP("legalText")}</p>
          </Prose>
          <p className="mt-3 text-xs text-[var(--text-3)] italic">
            {tP("legalConceptNote")}
          </p>
        </ContentCard>
      </ContentSection>

      {/* 7. CTA */}
      <div className="relative overflow-hidden rounded-[var(--radius)] bg-[var(--primary)] p-8 text-center text-white">
        <div
          className="ornament-tile absolute inset-0 pointer-events-none"
          aria-hidden="true"
          style={{ opacity: 0.08, filter: "brightness(3) saturate(0.5)" }}
        />
        <div className="relative">
          <h2 className="font-display text-xl font-bold mb-2">
            {tP("ctaTitle")}
          </h2>
          <p className="text-white/80 mb-6 text-sm leading-relaxed">
            {tP("ctaDescription")}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href={`/${locale}/contacts`}
              className="inline-flex items-center gap-2 rounded-[var(--radius)] bg-[var(--accent)] px-6 py-3 text-sm font-bold text-white hover:bg-[var(--accent-2)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
            >
              {tP("ctaButton")}
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
            <Link
              href={`/${locale}`}
              className="inline-flex items-center gap-2 rounded-[var(--radius)] border border-white/30 px-5 py-3 text-sm font-semibold text-white/90 hover:bg-white/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
            >
              {tP("ctaButtonAlt")}
            </Link>
          </div>
        </div>
      </div>
    </ContentPage>
  );
}
