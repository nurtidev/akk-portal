import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { routing } from "@/i18n/routing";
import {
  ContentPage,
  ContentSection,
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
    namespace: "content.insurance.meta",
  });
  return {
    title: t("title"),
    description: t("description"),
    openGraph: { title: t("title"), description: t("description") },
  };
}

export default async function InsurancePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "content" });
  const tI = await getTranslations({ locale, namespace: "content.insurance" });

  const sections = tI.raw("sections") as Array<{
    title: string;
    text: string;
  }>;

  return (
    <ContentPage
      title={tI("title")}
      subtitle={tI("subtitle")}
      breadcrumbs={[
        { label: t("breadcrumbs.home"), href: `/${locale}` },
        { label: tI("title") },
      ]}
    >
      <ContentSection>
        <p className="text-[var(--text-2)] text-base leading-relaxed mb-8">
          {tI("description")}
        </p>

        <div className="space-y-4">
          {sections.map((section, i) => (
            <ContentCard key={i} className="flex gap-4">
              <span className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[var(--primary-soft)] text-[var(--primary)] font-bold text-xs">
                {i + 1}
              </span>
              <div>
                <h3 className="font-semibold text-[var(--text)] mb-1">
                  {section.title}
                </h3>
                <p className="text-sm text-[var(--text-2)] leading-relaxed">
                  {section.text}
                </p>
              </div>
            </ContentCard>
          ))}
        </div>

        <div className="mt-8">
          <a
            href={tI("link")}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-[var(--radius)] bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[var(--primary-2)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
          >
            {tI("linkLabel")}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          </a>
        </div>
      </ContentSection>
    </ContentPage>
  );
}
