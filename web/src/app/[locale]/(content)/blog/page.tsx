import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { routing } from "@/i18n/routing";
import {
  ContentPage,
  ContentSection,
  ContentCard,
} from "@/components/content/content-page";
import { BlogQuestionForm } from "@/components/content/blog-question-form";
import { FallbackImage } from "@/components/content/hero-image";

export async function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "content.blog.meta" });
  return {
    title: t("title"),
    description: t("description"),
    openGraph: { title: t("title"), description: t("description") },
  };
}

export default async function BlogPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "content" });
  const tB = await getTranslations({ locale, namespace: "content.blog" });

  // Тексты для клиентской формы (передаются пропсами чтобы не терять SSG)
  const formLabels = {
    nameLabel: tB("form.nameLabel"),
    contactLabel: tB("form.contactLabel"),
    messageLabel: tB("form.messageLabel"),
    submitLabel: tB("form.submitLabel"),
    successMessage: tB("form.successMessage"),
    namePlaceholder: tB("form.namePlaceholder"),
    contactPlaceholder: tB("form.contactPlaceholder"),
    messagePlaceholder: tB("form.messagePlaceholder"),
  };

  return (
    <ContentPage
      title={tB("title")}
      subtitle={tB("subtitle")}
      imageSlug="blog"
      breadcrumbs={[
        { label: t("breadcrumbs.home"), href: `/${locale}` },
        { label: tB("title") },
      ]}
    >
      {/* Блок Председателя */}
      <ContentSection>
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
          {/* Фото-слот */}
          <div className="flex-shrink-0">
            <div className="h-32 w-32 rounded-full overflow-hidden bg-[var(--primary-soft)] flex items-center justify-center sm:h-40 sm:w-40">
              <FallbackImage
                src="/img/content/blog-chairman.jpg"
                alt={tB("chairmanName")}
                className="h-full w-full object-cover object-top"
              />
              <span
                className="hidden text-2xl font-bold text-[var(--primary)]"
                aria-hidden="true"
              >
                АА
              </span>
            </div>
          </div>

          {/* Текст приветствия */}
          <div className="flex-1">
            <h2 className="font-display text-lg font-bold text-[var(--text)] mb-0.5">
              {tB("chairmanName")}
            </h2>
            <p className="text-sm text-[var(--text-3)] mb-4">
              {tB("chairmanTitle")}
            </p>
            {/* TODO: согласовать текст приветствия с председателем */}
            <div className="space-y-3 text-[var(--text-2)] leading-relaxed">
              {(tB.raw("welcomeText") as string[]).map((paragraph, i) => (
                <p key={i}>{paragraph}</p>
              ))}
            </div>
          </div>
        </div>
      </ContentSection>

      {/* Форма «Задать вопрос» */}
      <ContentSection title={tB("formTitle")}>
        <ContentCard>
          <p className="text-sm text-[var(--text-2)] mb-6 leading-relaxed">
            {tB("formDescription")}
          </p>
          <BlogQuestionForm labels={formLabels} />
        </ContentCard>
      </ContentSection>
    </ContentPage>
  );
}
