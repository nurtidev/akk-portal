import { SiteLayout } from "@/components/layout/site-layout";
import { FunnelHome } from "@/components/funnel/funnel-home";

// Главная страница: лендинг + воронка заявки (трек B).
// Hero → программы → квиз → результаты → стресс → визард → успех.
// Переключение экранов — внутри FunnelProvider; подача заявки идёт через
// funnelSubmitAdapter (трек D) на Go-бэкенд.
export default function HomePage() {
  return (
    <SiteLayout>
      <FunnelHome />
    </SiteLayout>
  );
}
