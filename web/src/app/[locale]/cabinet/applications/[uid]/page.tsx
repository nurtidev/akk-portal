// =====================================================
// ===== D4: страница /cabinet/applications/[uid] ======
// Трекер этапов + каталог документов + демо-управление заявкой.
// =====================================================

import { SiteLayout } from "@/components/layout/site-layout";
import { ApplicationView } from "@/components/cabinet/application-view";

export default async function ApplicationPage({
  params,
}: {
  params: Promise<{ uid: string }>;
}) {
  const { uid } = await params;
  return (
    <SiteLayout>
      <main id="main-content" className="flex-1">
        <ApplicationView uid={uid} />
      </main>
    </SiteLayout>
  );
}
