import { SiteLayout } from "@/components/layout/site-layout";

/**
 * Layout для группы контентных страниц (content).
 * Все страницы C2–C7 рендерятся внутри SiteLayout (шапка + подвал).
 */
export default function ContentGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SiteLayout>{children}</SiteLayout>;
}
