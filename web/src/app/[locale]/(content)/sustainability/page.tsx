import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { routing } from "@/i18n/routing";
import {
  ContentPage,
  ContentSection,
  CardGrid,
  ContentCard,
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
    namespace: "content.sustainability.meta",
  });
  return {
    title: t("title"),
    description: t("description"),
    openGraph: { title: t("title"), description: t("description") },
  };
}

export default async function SustainabilityPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "content" });
  const tS = await getTranslations({
    locale,
    namespace: "content.sustainability",
  });

  const pillars = tS.raw("pillars") as Array<{
    title: string;
    description: string;
    points?: string[];
  }>;

  const rating = tS.raw("rating") as {
    title: string;
    agency: string;
    current: string;
    currentLabel: string;
    target: string;
    targetLabel: string;
    note: string;
    disclosure: string;
  };

  const greenCategories = tS.raw("greenCategories") as Array<{
    title: string;
    description: string;
  }>;

  const sdgGoals = tS.raw("sdgGoals") as Array<{
    num: number;
    name: string;
    active: boolean;
  }>;

  const scopes = tS.raw("scopes") as Array<{
    code: string;
    title: string;
    description: string;
    status: "verified" | "draft";
    statusLabel: string;
  }>;

  const wep = tS.raw("wep") as {
    title: string;
    description: string;
    progressLabel: string;
    progressText: string;
  };

  const socialStats = tS.raw("socialStats") as Array<{
    value: string;
    label: string;
    note?: string;
  }>;

  const news = tS.raw("news") as Array<{
    date: string;
    title: string;
    minutes: string;
  }>;

  const commitments = tS.raw("commitments") as string[];
  const objectives = tS.raw("objectives") as string[];
  const documents = tS.raw("documents") as Array<{
    title: string;
    url: string;
    meta?: string;
  }>;

  // Иконки трёх направлений ESG (экологическая · социальная · управление) —
  // SVG вместо эмодзи, по дизайн-коду платформы.
  const PILLAR_ICONS = [
    // Экологическая — лист
    <svg key="env" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
      <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
      <path d="M2 22c1.5-2 3-3.5 5-5" />
    </svg>,
    // Социальная — люди
    <svg key="soc" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>,
    // Корпоративное управление — щит с галочкой
    <svg key="gov" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>,
  ];

  // Маленькая галочка для списков пунктов внутри карточек.
  const Check = (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );

  return (
    <ContentPage
      title={tS("title")}
      subtitle={tS("subtitle")}
      imageSlug="sustainability"
      breadcrumbs={[
        { label: t("breadcrumbs.home"), href: `/${locale}` },
        { label: tS("title") },
      ]}
    >
      {/* Три направления ESG (экологическая · социальная · управление) */}
      <ContentSection title={tS("pillarsTitle")}>
        <p className="text-[var(--text-2)] mb-6 leading-relaxed">
          {tS("pillarsDescription")}
        </p>
        <CardGrid cols={3}>
          {pillars.map((pillar, i) => (
            <ContentCard key={i}>
              <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-[var(--primary-soft)] text-[var(--primary)]">
                {PILLAR_ICONS[i] ?? PILLAR_ICONS[0]}
              </div>
              <h3 className="font-semibold text-[var(--text)] mb-2">
                {pillar.title}
              </h3>
              <p className="text-sm text-[var(--text-2)] leading-relaxed">
                {pillar.description}
              </p>
              {pillar.points && pillar.points.length > 0 && (
                <ul className="mt-3 space-y-1.5 border-t border-[var(--border)] pt-3">
                  {pillar.points.map((point, j) => (
                    <li key={j} className="flex items-start gap-2 text-sm text-[var(--text-2)]">
                      <span className="mt-0.5 flex-shrink-0 text-[var(--accent)]" aria-hidden="true">
                        {Check}
                      </span>
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              )}
            </ContentCard>
          ))}
        </CardGrid>
      </ContentSection>

      {/* ESG-рейтинг Sustainable Fitch */}
      <ContentSection title={rating.title}>
        <ContentCard>
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            {/* Текущий → цель */}
            <div className="flex items-center gap-4 sm:gap-5">
              <div className="text-center">
                <div className="font-display text-3xl font-bold leading-none text-[var(--primary)] md:text-4xl">
                  {rating.current}
                </div>
                <div className="mt-1.5 text-xs font-medium text-[var(--text-2)]">
                  {rating.currentLabel}
                </div>
              </div>
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="flex-shrink-0 text-[var(--text-3)]"
                aria-hidden="true"
              >
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
              <div className="text-center">
                <div className="font-display text-3xl font-bold leading-none text-[var(--accent-2)] md:text-4xl">
                  {rating.target}
                </div>
                <div className="mt-1.5 text-xs font-medium text-[var(--text-2)]">
                  {rating.targetLabel}
                </div>
              </div>
            </div>

            {/* Разделитель + агентство и пояснение */}
            <div className="flex-1 sm:border-l sm:border-[var(--border)] sm:pl-5">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--primary-soft)] px-3 py-1 text-xs font-semibold text-[var(--primary)]">
                {rating.agency}
              </span>
              <p className="mt-2.5 text-sm leading-relaxed text-[var(--text-2)]">
                {rating.note}
              </p>
            </div>
          </div>
          <p className="mt-4 border-t border-[var(--border)] pt-3 text-xs leading-relaxed text-[var(--text-3)]">
            {rating.disclosure}
          </p>
        </ContentCard>
      </ContentSection>

      {/* Зелёные финансы — 6 категорий по Таксономии РК */}
      <ContentSection title={tS("greenFinanceTitle")}>
        <p className="text-[var(--text-2)] mb-6 leading-relaxed">
          {tS("greenFinanceDescription")}
        </p>
        <CardGrid cols={3}>
          {greenCategories.map((cat, i) => (
            <ContentCard key={i}>
              <h3 className="font-semibold text-[var(--text)] mb-1.5">
                {cat.title}
              </h3>
              <p className="text-sm text-[var(--text-2)] leading-relaxed">
                {cat.description}
              </p>
            </ContentCard>
          ))}
        </CardGrid>
        <p className="mt-4 rounded-[var(--radius)] border border-dashed border-[var(--border)] bg-[var(--primary-tint)] px-4 py-3 text-sm text-[var(--text-2)]">
          {tS("greenFinanceNote")}
        </p>
      </ContentSection>

      {/* Климатические данные — выбросы GHG (Scope 1/2/3) */}
      <ContentSection title={tS("climateTitle")}>
        <p className="text-[var(--text-2)] mb-5 leading-relaxed">
          {tS("climateDescription")}
        </p>

        {/* Совокупные выбросы — заметная цифра */}
        <ContentCard className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-4">
          <span className="font-display text-2xl font-bold leading-none text-[var(--primary)] md:text-3xl">
            {tS("climateTotalValue")}
          </span>
          <span className="text-sm text-[var(--text-2)]">
            {tS("climateTotalLabel")}
          </span>
          <span className="text-xs text-[var(--text-3)] sm:ml-auto">
            {tS("climateTotalMeta")}
          </span>
        </ContentCard>

        {/* Три охвата выбросов со статус-бейджем */}
        <CardGrid cols={3}>
          {scopes.map((scope, i) => (
            <ContentCard key={i}>
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="font-display text-sm font-bold text-[var(--text-3)]">
                  {scope.code}
                </span>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                    scope.status === "verified"
                      ? "bg-[var(--primary-soft)] text-[var(--primary)]"
                      : "border border-[var(--border)] text-[var(--text-3)]"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      scope.status === "verified"
                        ? "bg-[var(--primary)]"
                        : "bg-[var(--text-3)]"
                    }`}
                  />
                  {scope.statusLabel}
                </span>
              </div>
              <h3 className="font-semibold text-[var(--text)] mb-1.5">
                {scope.title}
              </h3>
              <p className="text-sm text-[var(--text-2)] leading-relaxed">
                {scope.description}
              </p>
            </ContentCard>
          ))}
        </CardGrid>

        <p className="mt-4 text-xs leading-relaxed text-[var(--text-3)]">
          {tS("climateStandardsNote")}
        </p>
      </ContentSection>

      {/* Цели устойчивого развития ООН (14 из 17) */}
      <ContentSection title={tS("sdgTitle")}>
        <p className="text-[var(--text-2)] mb-4 leading-relaxed">
          {tS("sdgDescription")}
        </p>
        <div className="mb-5 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--primary-soft)] px-3 py-1 text-xs font-semibold text-[var(--primary)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--primary)]" />
            {tS("sdgActiveNote")}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] px-3 py-1 text-xs font-medium text-[var(--text-3)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--text-3)]" />
            {tS("sdgOutNote")}
          </span>
        </div>
        <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
          {sdgGoals.map((goal) => (
            <li
              key={goal.num}
              className={`flex items-center gap-3 rounded-[var(--radius)] border p-2.5 ${
                goal.active
                  ? "border-[var(--primary-soft)] bg-[var(--primary-tint)]"
                  : "border-[var(--border)] bg-[var(--surface)] opacity-55"
              }`}
            >
              <span
                className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-[var(--radius-sm)] font-display text-sm font-bold ${
                  goal.active
                    ? "bg-[var(--primary)] text-white"
                    : "bg-[var(--border)] text-[var(--text-3)]"
                }`}
              >
                {goal.num}
              </span>
              <span
                className={`text-xs leading-snug ${
                  goal.active ? "text-[var(--text)]" : "text-[var(--text-3)]"
                }`}
              >
                {goal.name}
              </span>
            </li>
          ))}
        </ul>
      </ContentSection>

      {/* Социальная ответственность — Декларация WEP + показатели */}
      <ContentSection title={tS("socialTitle")}>
        <p className="text-[var(--text-2)] mb-5 leading-relaxed">
          {tS("socialDescription")}
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          {/* Карточка WEP */}
          <ContentCard>
            <div className="mb-2 flex items-center justify-between gap-2">
              <h3 className="font-semibold text-[var(--text)]">{wep.title}</h3>
              <span className="inline-flex items-center gap-1 rounded-full border border-[var(--accent-soft)] bg-[var(--accent-soft)] px-2.5 py-0.5 text-[11px] font-semibold text-[var(--accent-2)]">
                {wep.progressLabel}
              </span>
            </div>
            <p className="text-sm text-[var(--text-2)] leading-relaxed">
              {wep.description}
            </p>
            <p className="mt-3 border-t border-[var(--border)] pt-3 text-sm text-[var(--text-2)] leading-relaxed">
              {wep.progressText}
            </p>
          </ContentCard>

          {/* Социальные показатели */}
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-2">
            {socialStats.map((s, i) => (
              <ContentCard key={i}>
                <div className="font-display text-2xl font-bold leading-none text-[var(--primary)]">
                  {s.value}
                </div>
                <div className="mt-2 text-sm font-medium text-[var(--text)]">
                  {s.label}
                </div>
                {s.note && (
                  <div className="mt-0.5 text-xs text-[var(--text-3)]">
                    {s.note}
                  </div>
                )}
              </ContentCard>
            ))}
          </div>
        </div>
      </ContentSection>

      {/* Обязательства */}
      <ContentSection title={tS("commitmentsTitle")}>
        <p className="text-[var(--text-2)] mb-4 leading-relaxed">
          {tS("commitmentsDescription")}
        </p>
        <ul className="space-y-3">
          {commitments.map((item, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="mt-1 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-[var(--primary)] text-white text-[10px] font-bold">
                {i + 1}
              </span>
              <span className="text-[var(--text-2)]">{item}</span>
            </li>
          ))}
        </ul>
      </ContentSection>

      {/* Задачи */}
      <ContentSection title={tS("objectivesTitle")}>
        <div className="grid gap-3 sm:grid-cols-2">
          {objectives.map((obj, i) => (
            <ContentCard key={i} className="flex items-start gap-3">
              <span
                className="mt-0.5 flex-shrink-0 text-[var(--accent)]"
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
              <span className="text-sm text-[var(--text-2)]">{obj}</span>
            </ContentCard>
          ))}
        </div>
      </ContentSection>

      {/* Международные стандарты */}
      <ContentSection title={tS("standardsTitle")}>
        <ContentCard>
          <p className="text-[var(--text-2)] leading-relaxed mb-3">
            {tS("standardsDescription")}
          </p>
          <div className="flex flex-wrap gap-2 mt-2">
            {(tS.raw("standardsTags") as string[]).map((tag, i) => (
              <span
                key={i}
                className="rounded-full border border-[var(--primary-soft)] bg-[var(--primary-soft)] px-3 py-1 text-xs font-medium text-[var(--primary)]"
              >
                {tag}
              </span>
            ))}
          </div>
        </ContentCard>
      </ContentSection>

      {/* Новости ESG */}
      <ContentSection title={tS("newsTitle")}>
        <div className="grid gap-4 md:grid-cols-3">
          {news.map((item, i) => (
            <ContentCard key={i} className="flex flex-col">
              <div className="mb-2 flex items-center gap-2 text-xs text-[var(--text-3)]">
                <span>{item.date}</span>
                <span aria-hidden="true">·</span>
                <span>{item.minutes}</span>
              </div>
              <p className="text-sm font-medium leading-snug text-[var(--text)]">
                {item.title}
              </p>
            </ContentCard>
          ))}
        </div>
      </ContentSection>

      {/* Документ политики */}
      <ContentSection title={tS("documentsTitle")}>
        <DocumentList
          items={documents}
          downloadLabel={tS("downloadLabel")}
        />
      </ContentSection>
    </ContentPage>
  );
}
