// =====================================================
// ===== D3: страница /cabinet =========================
// Личный кабинет: боковое меню + список заявок/профиль/документы/уведомления.
// useSearchParams требует Suspense-границу.
// =====================================================

import { Suspense } from "react";
import { SiteLayout } from "@/components/layout/site-layout";
import { CabinetView } from "@/components/cabinet/cabinet-view";

export default function CabinetPage() {
  return (
    <SiteLayout>
      <main id="main-content" className="flex-1">
        <Suspense fallback={null}>
          <CabinetView />
        </Suspense>
      </main>
    </SiteLayout>
  );
}
