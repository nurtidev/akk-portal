import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { routing } from "@/i18n/routing";
import {
  ContentPage,
  ContentSection,
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
    namespace: "content.reporting.meta",
  });
  return {
    title: t("title"),
    description: t("description"),
    openGraph: { title: t("title"), description: t("description") },
  };
}

export default async function ReportingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "content" });
  const tR = await getTranslations({ locale, namespace: "content.reporting" });

  const financialItems = tR.raw("financial.items") as Array<{
    year: string;
    title: string;
    auditor: string;
    url: string;
  }>;
  const annualItems = tR.raw("annual.items") as Array<{
    year: string;
    title: string;
    url: string;
  }>;

  return (
    <ContentPage
      title={tR("title")}
      imageSlug="reporting"
      breadcrumbs={[
        { label: t("breadcrumbs.home"), href: `/${locale}` },
        { label: tR("title") },
      ]}
    >
      {/* Финансовая отчётность */}
      <ContentSection title={tR("financial.title")}>
        <p className="text-[var(--text-2)] mb-5 leading-relaxed">
          {tR("financial.description")}
        </p>
        <DocumentList
          downloadLabel={tR("downloadLabel")}
          items={financialItems.map((item) => ({
            title: item.title,
            url: item.url,
            // Показываем аудитора, только если он реально указан (не пусто/не TODO).
            meta:
              item.auditor && !item.auditor.startsWith("TODO")
                ? item.auditor
                : undefined,
          }))}
        />
      </ContentSection>

      {/* Годовые отчёты */}
      <ContentSection title={tR("annual.title")}>
        <p className="text-[var(--text-2)] mb-5 leading-relaxed">
          {tR("annual.description")}
        </p>
        <DocumentList
          downloadLabel={tR("downloadLabel")}
          items={annualItems.map((item) => ({
            title: item.title,
            url: item.url,
          }))}
        />
      </ContentSection>
    </ContentPage>
  );
}
