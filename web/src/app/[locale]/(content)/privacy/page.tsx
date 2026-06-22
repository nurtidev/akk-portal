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
  const t = await getTranslations({ locale, namespace: "content.privacy.meta" });
  return {
    title: t("title"),
    description: t("description"),
    openGraph: { title: t("title"), description: t("description") },
  };
}

export default async function PrivacyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "content" });
  const tp = await getTranslations({ locale, namespace: "content.privacy" });

  const dataItems = tp.raw("dataItems") as string[];
  const purposeItems = tp.raw("purposeItems") as string[];
  const rightsItems = tp.raw("rightsItems") as string[];

  const Bullets = ({ items }: { items: string[] }) => (
    <ul className="space-y-2">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-3">
          <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-[var(--primary)]" />
          <span className="text-[var(--text-2)] leading-relaxed">{item}</span>
        </li>
      ))}
    </ul>
  );

  return (
    <ContentPage
      title={tp("title")}
      subtitle={tp("subtitle")}
      breadcrumbs={[
        { label: t("breadcrumbs.home"), href: `/${locale}` },
        { label: tp("title") },
      ]}
    >
      <p className="mb-8 max-w-3xl text-[var(--text-2)] leading-relaxed">{tp("intro")}</p>

      <ContentSection title={tp("dataTitle")}>
        <Bullets items={dataItems} />
      </ContentSection>

      <ContentSection title={tp("purposeTitle")}>
        <Bullets items={purposeItems} />
      </ContentSection>

      <ContentSection title={tp("basisTitle")}>
        <p className="max-w-3xl text-[var(--text-2)] leading-relaxed">{tp("basisText")}</p>
      </ContentSection>

      <ContentSection title={tp("rightsTitle")}>
        <Bullets items={rightsItems} />
      </ContentSection>

      <ContentSection title={tp("contactsTitle")}>
        <p className="mb-4 max-w-3xl text-[var(--text-2)] leading-relaxed">{tp("contactsText")}</p>
        <ContentCard className="max-w-sm">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--text-3)]">
            {tp("phoneLabel")}
          </p>
          <a
            href={`tel:${tp("phone")}`}
            className="text-lg font-bold text-[var(--primary)] hover:underline"
          >
            {tp("phone")}
          </a>
        </ContentCard>
        <p className="mt-6 text-xs italic text-[var(--text-3)]">{tp("note")}</p>
      </ContentSection>
    </ContentPage>
  );
}
