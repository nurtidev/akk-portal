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
import { BankLogo } from "@/components/content/bank-logo";

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
    namespace: "content.howToGet.meta",
  });
  return {
    title: t("title"),
    description: t("description"),
    openGraph: { title: t("title"), description: t("description") },
  };
}

export default async function HowToGetPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "content" });
  const tH = await getTranslations({ locale, namespace: "content.howToGet" });

  const steps = tH.raw("steps") as Array<{
    title: string;
    description: string;
  }>;

  const channels = tH.raw("channels") as Array<{
    name: string;
    description: string;
    url: string;
    logo?: string;
  }>;

  return (
    <ContentPage
      title={tH("title")}
      subtitle={tH("subtitle")}
      imageSlug="how-to-get"
      breadcrumbs={[
        { label: t("breadcrumbs.home"), href: `/${locale}` },
        { label: tH("title") },
      ]}
    >
      {/* Таймлайн 7 этапов */}
      <ContentSection title={tH("stepsTitle")}>
        <p className="text-[var(--text-2)] mb-8 leading-relaxed">
          {tH("stepsDescription")}
        </p>
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

      {/* Каналы финансирования */}
      <ContentSection title={tH("channelsTitle")}>
        <p className="text-[var(--text-2)] mb-6 leading-relaxed">
          {tH("channelsDescription")}
        </p>
        <CardGrid cols={3}>
          {channels.map((channel, i) => (
            <ContentCard key={i}>
              <div className="mb-2 flex items-center gap-3">
                {channel.logo && <BankLogo slug={channel.logo} name={channel.name} />}
                <h3 className="font-semibold text-[var(--primary)]">
                  {channel.name}
                </h3>
              </div>
              <p className="text-sm text-[var(--text-2)] leading-relaxed mb-4">
                {channel.description}
              </p>
              <a
                href={channel.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--primary)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] rounded"
              >
                {tH("channelOpenAccountLabel")}
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
              </a>
            </ContentCard>
          ))}
        </CardGrid>
      </ContentSection>

      {/* Блок AGRONESIE.KZ */}
      <ContentSection title={tH("agronesieTitle")}>
        <ContentCard className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex-1">
            <p className="font-semibold text-[var(--accent-2)] text-lg mb-2">
              {tH("agronesieHighlight")}
            </p>
            <p className="text-[var(--text-2)] leading-relaxed">
              {tH("agronesieDescription")}
            </p>
          </div>
          <a
            href={tH("agronesieUrl")}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-shrink-0 rounded-[var(--radius)] bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white hover:bg-[var(--accent-2)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          >
            {tH("agronesieLabel")}
          </a>
        </ContentCard>
      </ContentSection>

      {/* CTA — Подобрать программу */}
      <div className="rounded-[var(--radius)] bg-[var(--primary)] p-8 text-center text-white">
        <h2 className="font-display text-xl font-bold mb-2">
          {tH("ctaTitle")}
        </h2>
        <p className="text-white/80 mb-6 text-sm leading-relaxed">
          {tH("ctaDescription")}
        </p>
        <Link
          href={`/${locale}`}
          className="inline-flex items-center gap-2 rounded-[var(--radius)] bg-[var(--accent)] px-6 py-3 text-sm font-bold text-white hover:bg-[var(--accent-2)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
        >
          {tH("ctaButton")}
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
