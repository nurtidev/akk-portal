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
    namespace: "content.contacts.meta",
  });
  return {
    title: t("title"),
    description: t("description"),
    openGraph: { title: t("title"), description: t("description") },
  };
}

interface Branch {
  region: string;
  city: string;
  address: string;
  phone: string;
}

export default async function ContactsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "content" });
  const tC = await getTranslations({ locale, namespace: "content.contacts" });

  const branches = tC.raw("branches") as Branch[];

  return (
    <ContentPage
      title={tC("title")}
      breadcrumbs={[
        { label: t("breadcrumbs.home"), href: `/${locale}` },
        { label: tC("title") },
      ]}
    >
      {/* Центральный аппарат */}
      <ContentSection title={tC("hqTitle")}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Адрес */}
          <ContentCard>
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[var(--primary-soft)] text-[var(--primary)]">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-3)] mb-1">
                  Адрес
                </p>
                <p className="text-sm text-[var(--text)]">
                  {tC("hqAddress")}
                </p>
                <p className="text-xs text-[var(--text-3)] mt-1">
                  {tC("hqWorkHours")}
                </p>
              </div>
            </div>
          </ContentCard>

          {/* Телефоны */}
          <ContentCard>
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[var(--primary-soft)] text-[var(--primary)]">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-3)] mb-1">
                  {tC("hqCallCenterLabel")}
                </p>
                <a
                  href="tel:1408"
                  className="block text-xl font-bold text-[var(--primary)] hover:underline"
                >
                  {tC("hqCallCenter")}
                </a>
                <a
                  href={`tel:${tC("hqPhone").replace(/[\s\-()]/g, "")}`}
                  className="block text-sm text-[var(--text-2)] mt-1 hover:underline"
                >
                  {tC("hqPhone")}
                </a>
              </div>
            </div>
          </ContentCard>

          {/* Email и телефон доверия */}
          <ContentCard>
            <div className="space-y-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-3)] mb-1">
                  E-mail
                </p>
                <a
                  href={`mailto:${tC("hqEmail")}`}
                  className="text-sm font-medium text-[var(--primary)] hover:underline"
                >
                  {tC("hqEmail")}
                </a>
              </div>
              <div className="pt-2 border-t border-[var(--border-soft)]">
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-3)] mb-1">
                  {tC("hqHotlineLabel")}
                </p>
                <a
                  href={`tel:${tC("hqHotline").replace(/[\s\-()]/g, "")}`}
                  className="text-sm font-medium text-[var(--danger)] hover:underline"
                >
                  {tC("hqHotline")}
                </a>
              </div>
            </div>
          </ContentCard>
        </div>
      </ContentSection>

      {/* Региональные филиалы */}
      <ContentSection title={tC("branchesTitle")}>
        <p className="text-sm text-[var(--text-3)] mb-5">{tC("branchesNote")}</p>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {branches.map((branch, i) => (
            <ContentCard key={i} className="flex flex-col gap-2">
              <div>
                <p className="font-semibold text-[var(--primary)] text-sm">
                  {branch.region}
                </p>
                <p className="text-xs text-[var(--text-3)]">{branch.city}</p>
              </div>
              <div className="text-xs text-[var(--text-2)] space-y-1 pt-2 border-t border-[var(--border-soft)]">
                <p>{branch.address}</p>
                {branch.phone !== "TODO: телефон" &&
                  branch.phone !== "TODO: phone" &&
                  branch.phone !== "TODO: телефон" && (
                    <a
                      href={`tel:${branch.phone.replace(/[\s\-()]/g, "")}`}
                      className="block text-[var(--primary)] hover:underline"
                    >
                      {branch.phone}
                    </a>
                  )}
              </div>
            </ContentCard>
          ))}
        </div>

        <p className="mt-4 text-xs text-[var(--text-3)] italic">
          {tC("mapNote")}
        </p>
      </ContentSection>

      {/* Кредитные товарищества */}
      <ContentSection title={tC("creditPartnersTitle")}>
        <ContentCard>
          <p className="text-[var(--text-2)] mb-4">{tC("creditPartnersDesc")}</p>
          <a
            href={tC("creditPartnersLink")}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-[var(--radius-sm)] bg-[var(--primary-soft)] px-4 py-2 text-sm font-semibold text-[var(--primary)] hover:bg-[var(--primary)] hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
            {tC("creditPartnersLinkLabel")}
          </a>
        </ContentCard>
      </ContentSection>
    </ContentPage>
  );
}
