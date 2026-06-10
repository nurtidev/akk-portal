import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";

/** Ссылки колонки «Разделы» (slug страницы → ключ footer.sections). */
const SECTION_LINKS = [
  { slug: "about", key: "about" },
  { slug: "sustainability", key: "sustainability" },
  { slug: "how-to-get", key: "howToGet" },
  { slug: "problem-debt", key: "problemDebt" },
  { slug: "investment-projects", key: "investmentProjects" },
  { slug: "press", key: "press" },
  { slug: "faq", key: "faq" },
  { slug: "contacts", key: "contacts" },
] as const;

/**
 * SiteFooter — подвал по образцу index.html:2325–2363.
 * 3 колонки на тёмно-зелёном фоне:
 *   1. О корпорации (название, описание, адрес)
 *   2. Поддержка (телефон, email, мессенджеры)
 *   3. Программы (список)
 * + строка-дисклеймер
 */
/**
 * SlimFooter — однострочный подвал для служебных страниц (кабинет).
 * Большой футер после короткого контента на мобиле «съедал» экран.
 */
export function SlimFooter() {
  const t = useTranslations("footer");
  const locale = useLocale();

  return (
    <footer
      className="relative"
      style={{ background: "var(--primary)", color: "rgba(255,255,255,0.75)" }}
    >
      <div className="container mx-auto flex flex-wrap items-center justify-between gap-2 px-4 py-4 text-xs">
        <span>{t("orgTitle")}</span>
        <span className="flex items-center gap-4">
          <a href="tel:1408" className="hover:text-white transition-colors">
            {t("callCenterLabel")}
          </a>
          <Link href={`/${locale}`} className="hover:text-white transition-colors">
            {t("toHome")}
          </Link>
        </span>
      </div>
    </footer>
  );
}

export function SiteFooter() {
  const t = useTranslations("footer");
  const locale = useLocale();

  return (
    <footer
      className="site-footer relative overflow-hidden"
      id="contacts"
      style={{
        background: "var(--primary)",
        color: "rgba(255,255,255,0.85)",
      }}
    >
      {/* Орнамент-тайл (золотой вариант) */}
      <div
        className="ornament-tile absolute inset-0 pointer-events-none"
        aria-hidden="true"
        style={{ opacity: 0.06, filter: "brightness(3) saturate(0.5)" }}
      />

      <div className="container relative mx-auto px-4 py-12">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Колонка 1 — О корпорации */}
          <div>
            <h4 className="font-display font-semibold text-white text-base mb-3">
              {t("orgTitle")}
            </h4>
            <p
              className="text-sm leading-relaxed mb-3"
              style={{ color: "rgba(255,255,255,0.7)", maxWidth: "22rem" }}
            >
              {t("orgDescription")}
            </p>
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>
              {t("orgAddress")}
            </p>
          </div>

          {/* Колонка 2 — Поддержка */}
          <div>
            <h4 className="font-display font-semibold text-white text-base mb-3">
              {t("supportTitle")}
            </h4>
            <ul className="flex flex-col gap-2 text-sm">
              <li>
                <a
                  href="tel:1408"
                  className="hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white rounded"
                  style={{ color: "rgba(255,255,255,0.7)" }}
                >
                  {t("callCenterLabel")}
                </a>
              </li>
              <li>
                <a
                  href="mailto:info@agrocredit.kz"
                  className="hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white rounded"
                  style={{ color: "rgba(255,255,255,0.7)" }}
                >
                  {t("emailLabel")}
                </a>
              </li>
              <li>
                <Link
                  href="#"
                  className="hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white rounded"
                  style={{ color: "rgba(255,255,255,0.7)" }}
                >
                  {t("messengerLabel")}
                </Link>
              </li>
            </ul>
          </div>

          {/* Колонка 3 — Программы */}
          <div>
            <h4 className="font-display font-semibold text-white text-base mb-3">
              {t("programsTitle")}
            </h4>
            <ul className="flex flex-col gap-2 text-sm">
              {(
                [
                  "kenDala2",
                  "agrobusiness",
                  "agrobusiness2",
                  "igilikBereke",
                  "feedlot",
                  "isker",
                ] as const
              ).map((key) => (
                <li key={key}>
                  <Link
                    href="#programs"
                    className="hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white rounded"
                    style={{ color: "rgba(255,255,255,0.7)" }}
                  >
                    {t(`programs.${key}`)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Колонка 4 — Разделы сайта (F5) */}
          <div>
            <h4 className="font-display font-semibold text-white text-base mb-3">
              {t("sectionsTitle")}
            </h4>
            <ul className="flex flex-col gap-2 text-sm">
              {SECTION_LINKS.map((item) => (
                <li key={item.slug}>
                  <Link
                    href={`/${locale}/${item.slug}`}
                    className="hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white rounded"
                    style={{ color: "rgba(255,255,255,0.7)" }}
                  >
                    {t(`sections.${item.key}`)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Дисклеймер */}
        <div
          className="mt-10 pt-6 border-t text-xs leading-relaxed"
          style={{
            borderColor: "rgba(255,255,255,0.15)",
            color: "rgba(255,255,255,0.45)",
          }}
        >
          <strong style={{ color: "rgba(255,255,255,0.6)" }}>
            Демо-прототип онбординга.{" "}
          </strong>
          {t("disclaimer")}
        </div>
      </div>
    </footer>
  );
}
