import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { routing } from "@/i18n/routing";
import { ContentPage, ContentSection } from "@/components/content/content-page";
import {
  getPressItemsByType,
  type PressItem,
} from "@/components/content/press-data";

export async function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "content.press.meta" });
  return {
    title: t("title"),
    description: t("description"),
    openGraph: { title: t("title"), description: t("description") },
  };
}

function PressCard({
  item,
  locale,
  readMoreLabel,
}: {
  item: PressItem;
  locale: string;
  readMoreLabel: string;
}) {
  const dateFormatted = new Date(item.date).toLocaleDateString(
    locale === "kk" ? "kk-KZ" : locale === "en" ? "en-GB" : "ru-RU",
    { day: "numeric", month: "long", year: "numeric" }
  );

  return (
    <article className="flex flex-col rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-sm)] overflow-hidden hover:shadow-[var(--shadow)] transition-shadow">
      {/* Цветная полоска */}
      <div
        className="h-1.5 flex-shrink-0"
        style={{ background: item.imagePlaceholder ?? "var(--primary)" }}
      />
      <div className="flex flex-col flex-1 p-5">
        {item.source && (
          <span className="mb-2 inline-block text-xs font-semibold uppercase tracking-wide text-[var(--accent-2)]">
            {item.source}
          </span>
        )}
        <time
          dateTime={item.date}
          className="mb-2 text-xs text-[var(--text-3)]"
        >
          {dateFormatted}
        </time>
        <h3 className="font-display text-base font-semibold text-[var(--text)] leading-snug mb-2">
          {item.titleRu}
        </h3>
        <p className="text-sm text-[var(--text-2)] leading-relaxed flex-1">
          {item.leadRu}
        </p>
        <Link
          href={`/${locale}/press/${item.slug}`}
          className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-[var(--primary)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] rounded"
        >
          {readMoreLabel}
          <svg
            width="14"
            height="14"
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
    </article>
  );
}

export default async function PressPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "content" });
  const tP = await getTranslations({ locale, namespace: "content.press" });

  const news = getPressItemsByType("news");
  const media = getPressItemsByType("media");
  const stories = getPressItemsByType("story");

  return (
    <ContentPage
      title={tP("title")}
      breadcrumbs={[
        { label: t("breadcrumbs.home"), href: `/${locale}` },
        { label: tP("title") },
      ]}
    >
      {/* Новости */}
      <ContentSection title={tP("tabs.news")}>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {news.map((item) => (
            <PressCard
              key={item.slug}
              item={item}
              locale={locale}
              readMoreLabel={tP("readMore")}
            />
          ))}
        </div>
      </ContentSection>

      {/* СМИ о нас */}
      <ContentSection title={tP("tabs.media")}>
        <div className="grid gap-5 sm:grid-cols-2">
          {media.map((item) => (
            <PressCard
              key={item.slug}
              item={item}
              locale={locale}
              readMoreLabel={tP("readMore")}
            />
          ))}
        </div>
      </ContentSection>

      {/* Истории успеха */}
      <ContentSection title={tP("tabs.stories")}>
        <div className="grid gap-5 sm:grid-cols-2">
          {stories.map((item) => (
            <PressCard
              key={item.slug}
              item={item}
              locale={locale}
              readMoreLabel={tP("readMore")}
            />
          ))}
        </div>
      </ContentSection>
    </ContentPage>
  );
}
