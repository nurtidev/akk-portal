import { SiteHeader } from "./site-header";
import { SiteFooter, SlimFooter } from "./site-footer";

interface SiteLayoutProps {
  children: React.ReactNode;
  /** slim — однострочный подвал для служебных страниц (кабинет): большой футер
      на мобиле занимал большую часть экрана после короткого контента. */
  footer?: "full" | "slim";
}

/**
 * SiteLayout — оболочка с шапкой и подвалом.
 * Используется в [locale]/layout.tsx для каждой страницы.
 */
export function SiteLayout({ children, footer = "full" }: SiteLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Skip-link для доступности (WCAG 2.4.1) */}
      <a
        href="#main-content"
        className="sr-only focus-visible:not-sr-only focus-visible:fixed focus-visible:top-4 focus-visible:left-4 focus-visible:z-[100] focus-visible:rounded focus-visible:bg-[var(--primary)] focus-visible:px-4 focus-visible:py-2 focus-visible:text-white focus-visible:outline-none"
      >
        {/* Текст через useTranslations в клиентском компоненте — здесь статичная метка */}
        Перейти к содержимому
      </a>
      <SiteHeader />
      <div className="flex-1">{children}</div>
      {footer === "slim" ? <SlimFooter /> : <SiteFooter />}
    </div>
  );
}
