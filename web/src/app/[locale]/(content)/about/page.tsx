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
  const t = await getTranslations({ locale, namespace: "content.about.meta" });
  return {
    title: t("title"),
    description: t("description"),
    openGraph: {
      title: t("title"),
      description: t("description"),
    },
  };
}

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "content" });
  const tAbout = await getTranslations({ locale, namespace: "content.about" });

  const strategyItems = tAbout.raw("mission.strategy") as string[];
  const boardMembers = tAbout.raw("structure.boardMembers") as Array<{
    name: string;
    role: string;
  }>;
  const managementMembers = tAbout.raw("structure.managementMembers") as Array<{
    name: string;
    role: string;
  }>;
  const subsidiaries = tAbout.raw("structure.subsidiaries") as Array<{
    name: string;
    description: string;
  }>;
  const govItems = tAbout.raw("governance.items") as Array<{
    title: string;
    description: string;
  }>;

  return (
    <ContentPage
      title={tAbout("title")}
      subtitle={tAbout("subtitle")}
      breadcrumbs={[
        { label: t("breadcrumbs.home"), href: `/${locale}` },
        { label: tAbout("title") },
      ]}
    >
      {/* Миссия и стратегия */}
      <ContentSection title={tAbout("mission.title")}>
        <div className="grid gap-6 md:grid-cols-2 mb-6">
          <ContentCard>
            <h3 className="font-semibold text-[var(--primary)] mb-2 text-sm uppercase tracking-wide">
              Миссия
            </h3>
            <p className="text-[var(--text-2)] leading-relaxed">
              {tAbout("mission.mission")}
            </p>
          </ContentCard>
          <ContentCard>
            <h3 className="font-semibold text-[var(--accent-2)] mb-2 text-sm uppercase tracking-wide">
              Видение
            </h3>
            <p className="text-[var(--text-2)] leading-relaxed">
              {tAbout("mission.vision")}
            </p>
          </ContentCard>
        </div>

        {/* Стратегические приоритеты */}
        <h3 className="font-display font-semibold text-[var(--text)] mb-3">
          {tAbout("mission.strategyTitle")}
        </h3>
        <ul className="space-y-2">
          {strategyItems.map((item, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="mt-1.5 h-2 w-2 rounded-full bg-[var(--primary)] flex-shrink-0" />
              <span className="text-[var(--text-2)]">{item}</span>
            </li>
          ))}
        </ul>

        {/* Ключевые факты */}
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            {
              label: tAbout("mission.foundedLabel"),
              value: tAbout("mission.founded"),
            },
            {
              label: tAbout("mission.ownerLabel"),
              value: tAbout("mission.owner"),
            },
            {
              label: tAbout("mission.staffLabel"),
              value: tAbout("mission.staff"),
            },
            {
              label: tAbout("mission.branchesLabel"),
              value: tAbout("mission.branches"),
            },
          ].map((stat, i) => (
            <div
              key={i}
              className="rounded-[var(--radius)] bg-[var(--primary-soft)] p-4 text-center"
            >
              <div className="font-display text-xl font-bold text-[var(--primary)]">
                {stat.value}
              </div>
              <div className="mt-1 text-xs text-[var(--text-3)]">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </ContentSection>

      {/* Структура управления */}
      <ContentSection title={tAbout("structure.title")}>
        {/* Совет директоров */}
        <h3 className="font-semibold text-[var(--text)] mb-3">
          {tAbout("structure.boardTitle")}
        </h3>
        <CardGrid cols={3}>
          {boardMembers.map((member, i) => (
            <ContentCard key={i}>
              <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-[var(--primary-soft)] text-[var(--primary)] font-bold text-sm">
                {member.name.charAt(0) !== "T" ? member.name.charAt(0) : "?"}
              </div>
              <p className="font-medium text-[var(--text)]">{member.name}</p>
              <p className="text-xs text-[var(--text-3)] mt-1">{member.role}</p>
            </ContentCard>
          ))}
        </CardGrid>
        <p className="mt-3 text-xs text-[var(--text-3)] italic">
          {tAbout("structure.boardNote")}
        </p>

        {/* Правление */}
        <h3 className="font-semibold text-[var(--text)] mb-3 mt-8">
          {tAbout("structure.managementTitle")}
        </h3>
        <CardGrid cols={3}>
          {managementMembers.map((member, i) => (
            <ContentCard key={i}>
              <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[var(--accent-2)] font-bold text-sm">
                {member.name.charAt(0) !== "T" ? member.name.charAt(0) : "?"}
              </div>
              <p className="font-medium text-[var(--text)]">{member.name}</p>
              <p className="text-xs text-[var(--text-3)] mt-1">{member.role}</p>
            </ContentCard>
          ))}
        </CardGrid>
        <p className="mt-3 text-xs text-[var(--text-3)] italic">
          {tAbout("structure.managementNote")}
        </p>

        {/* Дочерние организации */}
        <h3 className="font-semibold text-[var(--text)] mb-3 mt-8">
          {tAbout("structure.subsidiariesTitle")}
        </h3>
        <CardGrid cols={2}>
          {subsidiaries.map((sub, i) => (
            <ContentCard key={i}>
              <p className="font-medium text-[var(--text)]">{sub.name}</p>
              <p className="text-sm text-[var(--text-3)] mt-1">
                {sub.description}
              </p>
            </ContentCard>
          ))}
        </CardGrid>
      </ContentSection>

      {/* Корпоративное управление */}
      <ContentSection title={tAbout("governance.title")}>
        <p className="text-[var(--text-2)] mb-5 leading-relaxed">
          {tAbout("governance.description")}
        </p>
        <CardGrid cols={2}>
          {govItems.map((item, i) => (
            <ContentCard key={i} className="flex gap-4">
              <span className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[var(--primary-soft)] text-[var(--primary)] font-bold text-xs">
                {i + 1}
              </span>
              <div>
                <p className="font-medium text-[var(--text)]">{item.title}</p>
                <p className="text-sm text-[var(--text-3)] mt-1">
                  {item.description}
                </p>
              </div>
            </ContentCard>
          ))}
        </CardGrid>
      </ContentSection>

      {/* Комплаенс */}
      <ContentSection title={tAbout("compliance.title")}>
        <p className="text-[var(--text-2)] mb-5 leading-relaxed">
          {tAbout("compliance.description")}
        </p>
        <div className="flex flex-wrap gap-4">
          <ContentCard className="flex-1 min-w-[220px]">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-3)] mb-1">
              {tAbout("compliance.hotlineTitle")}
            </p>
            <a
              href={`tel:${tAbout("compliance.hotlineNumber").replace(/\s/g, "")}`}
              className="text-lg font-bold text-[var(--primary)] hover:underline"
            >
              {tAbout("compliance.hotlineNumber")}
            </a>
            <p className="text-xs text-[var(--text-3)] mt-1">
              {tAbout("compliance.hotlineDesc")}
            </p>
          </ContentCard>
          <ContentCard className="flex-1 min-w-[220px]">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-3)] mb-1">
              {tAbout("compliance.emailLabel")}
            </p>
            <a
              href={`mailto:${tAbout("compliance.email")}`}
              className="text-sm font-medium text-[var(--primary)] hover:underline break-all"
            >
              {tAbout("compliance.email")}
            </a>
          </ContentCard>
        </div>
      </ContentSection>

      {/* Омбудсмен */}
      <ContentSection title={tAbout("ombudsman.title")}>
        <p className="text-[var(--text-2)] mb-3 leading-relaxed">
          {tAbout("ombudsman.description")}
        </p>
        <ContentCard className="flex items-start gap-4">
          <div className="flex-1">
            <a
              href={tAbout("ombudsman.website")}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--primary)] font-medium hover:underline"
            >
              {tAbout("ombudsman.websiteLabel")}
            </a>
            <p className="text-sm text-[var(--text-3)] mt-2">
              {tAbout("ombudsman.note")}
            </p>
          </div>
        </ContentCard>
      </ContentSection>
    </ContentPage>
  );
}
