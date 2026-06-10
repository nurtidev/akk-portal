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
    namespace: "content.problemDebt.meta",
  });
  return {
    title: t("title"),
    description: t("description"),
    openGraph: { title: t("title"), description: t("description") },
  };
}

export default async function ProblemDebtPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "content" });
  const tP = await getTranslations({
    locale,
    namespace: "content.problemDebt",
  });

  const mechanisms = tP.raw("mechanisms") as Array<{
    title: string;
    description: string;
  }>;

  const howToApplySteps = tP.raw("howToApplySteps") as string[];
  const reviewSteps = tP.raw("reviewSteps") as string[];

  return (
    <ContentPage
      title={tP("title")}
      subtitle={tP("subtitle")}
      imageSlug="problem-debt"
      breadcrumbs={[
        { label: t("breadcrumbs.home"), href: `/${locale}` },
        { label: tP("title") },
      ]}
    >
      {/* Механизмы урегулирования */}
      <ContentSection title={tP("mechanismsTitle")}>
        <p className="text-[var(--text-2)] mb-6 leading-relaxed">
          {tP("mechanismsDescription")}
        </p>
        <CardGrid cols={2}>
          {mechanisms.map((mech, i) => (
            <ContentCard key={i} className="flex gap-4">
              <span className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[var(--primary-soft)] text-[var(--primary)] font-bold text-sm">
                {i + 1}
              </span>
              <div>
                <h3 className="font-semibold text-[var(--text)] mb-1">
                  {mech.title}
                </h3>
                <p className="text-sm text-[var(--text-2)] leading-relaxed">
                  {mech.description}
                </p>
              </div>
            </ContentCard>
          ))}
        </CardGrid>
      </ContentSection>

      {/* Как подать заявление */}
      <ContentSection title={tP("howToApplyTitle")}>
        <p className="text-[var(--text-2)] mb-5 leading-relaxed">
          {tP("howToApplyDescription")}
        </p>
        <ul className="space-y-3">
          {howToApplySteps.map((step, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="mt-1 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-[var(--primary)] text-white text-[10px] font-bold">
                {i + 1}
              </span>
              <span className="text-[var(--text-2)]">{step}</span>
            </li>
          ))}
        </ul>
      </ContentSection>

      {/* Как рассматривается */}
      <ContentSection title={tP("reviewTitle")}>
        <p className="text-[var(--text-2)] mb-5 leading-relaxed">
          {tP("reviewDescription")}
        </p>
        <ul className="space-y-2">
          {reviewSteps.map((step, i) => (
            <li key={i} className="flex items-start gap-3">
              <span
                className="mt-1 flex-shrink-0 text-[var(--primary)]"
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
              <span className="text-[var(--text-2)] text-sm">{step}</span>
            </li>
          ))}
        </ul>
      </ContentSection>

      {/* Контакты */}
      <ContentSection title={tP("contactsTitle")}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <ContentCard>
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[var(--primary-soft)] text-[var(--primary)]">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-3)] mb-1">
                  {tP("contactCallCenterLabel")}
                </p>
                <a
                  href="tel:1408"
                  className="block text-2xl font-bold text-[var(--primary)] hover:underline"
                >
                  {tP("contactCallCenter")}
                </a>
                <p className="text-xs text-[var(--text-3)] mt-1">
                  {tP("contactCallCenterNote")}
                </p>
              </div>
            </div>
          </ContentCard>

          <ContentCard>
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[var(--primary-soft)] text-[var(--primary)]">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-3)] mb-1">
                  {tP("contactBranchesLabel")}
                </p>
                <p className="text-sm text-[var(--text-2)]">
                  {tP("contactBranchesNote")}
                </p>
              </div>
            </div>
          </ContentCard>

          <ContentCard>
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[var(--primary-soft)] text-[var(--primary)]">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-3)] mb-1">
                  E-mail
                </p>
                <a
                  href={`mailto:${tP("contactEmail")}`}
                  className="text-sm font-medium text-[var(--primary)] hover:underline break-all"
                >
                  {tP("contactEmail")}
                </a>
              </div>
            </div>
          </ContentCard>
        </div>
      </ContentSection>
    </ContentPage>
  );
}
