import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { routing } from "@/i18n/routing";
import {
  ContentPage,
  ContentSection,
  ContentCard,
} from "@/components/content/content-page";
import { PREAMBLE, SECTIONS, OFFICIAL_URL } from "@/data/constitution";

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
    namespace: "content.constitution.meta",
  });
  return {
    title: t("title"),
    description: t("description"),
    openGraph: { title: t("title"), description: t("description") },
  };
}

export default async function ConstitutionPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "content" });
  const tC = await getTranslations({
    locale,
    namespace: "content.constitution",
  });

  return (
    <ContentPage
      title={tC("title")}
      subtitle={tC("subtitle")}
      imageSlug="about"
      breadcrumbs={[
        { label: t("breadcrumbs.home"), href: `/${locale}` },
        { label: tC("title") },
      ]}
    >
      {/* Вводный контекст */}
      <ContentSection>
        <p className="text-[var(--text-2)] leading-relaxed">{tC("intro")}</p>
      </ContentSection>

      {/* Преамбула */}
      <ContentSection title="Преамбула">
        <ContentCard>
          {/* Цитата-преамбула — курсив, читаемый стиль */}
          <blockquote className="border-l-4 border-[var(--primary)] pl-4 italic text-[var(--text-2)] leading-relaxed text-sm md:text-base">
            {PREAMBLE}
          </blockquote>
        </ContentCard>
      </ContentSection>

      {/* Структура Основного закона */}
      <ContentSection title="Структура Основного закона">
        <ContentCard>
          <ol className="space-y-2">
            {SECTIONS.map((section, index) => (
              <li
                key={index}
                className="flex items-start gap-3 py-2 border-b border-[var(--border)] last:border-0"
              >
                {/* Номер раздела — акцентный маркер */}
                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-[var(--primary-soft)] text-[var(--primary)] text-xs font-bold flex items-center justify-center mt-0.5">
                  {index + 1}
                </span>
                <span className="text-[var(--text)] text-sm leading-relaxed">
                  {section}
                </span>
              </li>
            ))}
          </ol>
        </ContentCard>
      </ContentSection>

      {/* Ссылка на официальный полный текст */}
      <ContentSection>
        <div className="flex justify-center">
          <a
            href={OFFICIAL_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-[var(--radius)] bg-[var(--primary)] px-6 py-3 text-sm font-semibold text-white shadow-[var(--shadow-sm)] hover:opacity-90 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2"
          >
            {tC("sourceLabel")}
            {/* Иконка внешней ссылки */}
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
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
