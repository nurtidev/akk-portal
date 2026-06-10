import { useTranslations } from "next-intl";
import { SiteLayout } from "@/components/layout/site-layout";

export default function HomePage() {
  const t = useTranslations("home");

  return (
    <SiteLayout>
      <main id="main-content" className="flex-1">
        {/* Временный заглушка — заполнится треком B (Hero + воронка) */}
        <section className="container mx-auto px-4 py-24 text-center">
          <h1 className="font-display text-4xl font-bold text-[var(--primary)] mb-4">
            {t("heroTitle")}
          </h1>
          <p className="text-[var(--text-2)] text-lg max-w-2xl mx-auto">
            {t("heroLede")}
          </p>
        </section>
      </main>
    </SiteLayout>
  );
}
