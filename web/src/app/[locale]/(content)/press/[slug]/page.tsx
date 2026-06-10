import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { routing } from "@/i18n/routing";
import {
  ContentPage,
  Prose,
} from "@/components/content/content-page";
import {
  getAllPressSlugs,
  getPressItemBySlug,
} from "@/components/content/press-data";

/** SSG: перебираем все locale × slug */
export async function generateStaticParams() {
  const slugs = getAllPressSlugs();
  return routing.locales.flatMap((locale) =>
    slugs.map((slug) => ({ locale, slug }))
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const item = getPressItemBySlug(slug);
  if (!item) return {};
  return {
    title: `${item.titleRu} — АКК`,
    description: item.leadRu,
    openGraph: {
      title: `${item.titleRu} — АКК`,
      description: item.leadRu,
    },
  };
}

export default async function PressArticlePage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const item = getPressItemBySlug(slug);

  if (!item) notFound();

  const t = await getTranslations({ locale, namespace: "content" });
  const tP = await getTranslations({ locale, namespace: "content.press" });

  const dateFormatted = new Date(item.date).toLocaleDateString(
    locale === "kk" ? "kk-KZ" : locale === "en" ? "en-GB" : "ru-RU",
    { day: "numeric", month: "long", year: "numeric" }
  );

  // Простая разметка тела: абзацы через двойной перенос
  const paragraphs = item.bodyRu
    .split("\n\n")
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <ContentPage
      title={item.titleRu}
      breadcrumbs={[
        { label: t("breadcrumbs.home"), href: `/${locale}` },
        { label: tP("title"), href: `/${locale}/press` },
        { label: item.titleRu },
      ]}
    >
      {/* Метаданные статьи */}
      <div className="mb-6 flex flex-wrap items-center gap-3 text-sm text-[var(--text-3)]">
        <time dateTime={item.date}>{dateFormatted}</time>
        {item.source && (
          <>
            <span aria-hidden="true">·</span>
            <span className="text-[var(--accent-2)] font-medium">
              {item.source}
            </span>
          </>
        )}
      </div>

      {/* Лид */}
      <p className="mb-8 text-lg font-medium text-[var(--text-2)] leading-relaxed border-l-4 border-[var(--primary)] pl-4">
        {item.leadRu}
      </p>

      {/* Тело статьи */}
      <Prose>
        {paragraphs.map((para, i) => {
          // Маркированный список (строки с «-»)
          if (para.startsWith("- ")) {
            const lines = para.split("\n").filter((l) => l.startsWith("- "));
            return (
              <ul key={i} className="mb-4 pl-5 space-y-1">
                {lines.map((line, j) => (
                  <li key={j}>{line.slice(2)}</li>
                ))}
              </ul>
            );
          }
          // Курсив-источник (*Источник: ...*)
          if (para.startsWith("*") && para.endsWith("*")) {
            return (
              <p key={i} className="text-xs text-[var(--text-3)] italic">
                {para.slice(1, -1)}
              </p>
            );
          }
          return <p key={i}>{para}</p>;
        })}
      </Prose>

      {/* Ссылка на источник (для СМИ) */}
      {item.sourceUrl && (
        <div className="mt-8 pt-6 border-t border-[var(--border)]">
          <p className="text-xs text-[var(--text-3)] mb-1">
            {tP("sourceLabel")}:{" "}
            <a
              href={item.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--primary)] hover:underline"
            >
              {item.source}
            </a>
          </p>
        </div>
      )}

      {/* Ссылка назад */}
      <div className="mt-10">
        <Link
          href={`/${locale}/press`}
          className="inline-flex items-center gap-2 rounded-[var(--radius)] bg-[var(--primary-soft)] px-4 py-2.5 text-sm font-medium text-[var(--primary)] hover:bg-[var(--primary)] hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
        >
          {tP("backToPress")}
        </Link>
      </div>
    </ContentPage>
  );
}
