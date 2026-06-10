import { useTranslations } from "next-intl";
import { SiteLayout } from "@/components/layout/site-layout";
import { TokensPageClient } from "./tokens-client";

export default function TokensPage() {
  const t = useTranslations("tokens");

  return (
    <SiteLayout>
      <main id="main-content" className="container mx-auto px-4 py-12">
        <h1 className="font-display text-3xl font-bold text-[var(--primary)] mb-2">
          {t("title")}
        </h1>
        <p className="text-[var(--text-2)] mb-10">
          Страница-витрина дизайн-токенов АКК в светлой и тёмной темах.
        </p>

        <TokensPageClient />
      </main>
    </SiteLayout>
  );
}
