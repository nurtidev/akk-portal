// =====================================================
// ===== D3: layout кабинета ===========================
// Оборачивает поддерево /cabinet в AuthProvider (layout локали — зона трека F,
// поэтому провайдер монтируем здесь). SiteLayout (шапка/подвал) — в самих страницах.
// =====================================================

import { AuthProvider } from "@/components/auth/auth-provider";

export default function CabinetLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthProvider>{children}</AuthProvider>;
}
