"use client";

// =====================================================
// ===== D3: страница кабинета (оркестратор) ===========
// Боковое меню + контент активной вкладки. Заявки грузятся через API,
// активная вкладка синхронизируется с ?tab= в URL. Гость → CTA «Войти».
// =====================================================

import { useCallback, useEffect, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { listApplications, rejectLabel, appStageIndex } from "@/lib/api";
import type { Application } from "@/lib/api";
import { useAuth } from "@/components/auth/auth-provider";
import { AuthModal } from "@/components/auth/auth-modal";
import { CabinetSidebar } from "./cabinet-sidebar";
import { ProfileTab } from "./profile-tab";
import { ApplicationsList } from "./applications-list";
import { DocsTab, NotifTab, SupportTab } from "./simple-tabs";
import { isCabinetTab, type CabinetTab } from "./tabs";

export function CabinetView() {
  const t = useTranslations("cabinet");
  const { user, ready, openAuth, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const locale = pathname.split("/")[1] || "ru";

  const queryTab = search.get("tab");
  const [tab, setTab] = useState<CabinetTab>(
    isCabinetTab(queryTab) ? queryTab : "profile",
  );
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  // Синхронизация активной вкладки с URL (?tab=).
  useEffect(() => {
    if (isCabinetTab(queryTab) && queryTab !== tab) setTab(queryTab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryTab]);

  const loadApps = useCallback(async () => {
    setLoading(true);
    const r = await listApplications();
    setApps(r.ok && Array.isArray(r.data) ? r.data : []);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (user) void loadApps();
  }, [user, loadApps]);

  function selectTab(next: CabinetTab) {
    setTab(next);
    const sp = new URLSearchParams(search.toString());
    sp.set("tab", next);
    router.replace(`${pathname}?${sp.toString()}`, { scroll: false });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // Непрочитанные уведомления = число событий по заявкам (демо-эвристика).
  const unread = apps.reduce((n, a) => {
    let c = 1; // «принята»
    if (rejectLabel(a.status) || appStageIndex(a.status) > 0) c += 1;
    return n + c;
  }, 0);

  if (ready && !user) {
    return (
      <>
        <GuestPrompt onLogin={() => openAuth("login")} t={t} locale={locale} />
        <AuthModal />
      </>
    );
  }

  if (!user) {
    // Идёт восстановление сессии.
    return (
      <div className="mx-auto max-w-[1080px] px-4 py-16 text-center text-sm text-[var(--text-3)]">
        {t("apps.loading")}
      </div>
    );
  }

  return (
    <div className="mx-auto grid max-w-[1080px] grid-cols-1 gap-4 px-4 py-4 md:grid-cols-[240px_1fr] md:gap-7 md:py-7">
      <CabinetSidebar
        active={tab}
        onSelect={selectTab}
        onHome={() => router.push(`/${locale}`)}
        onLogout={() => {
          logout();
          router.push(`/${locale}`);
        }}
        unread={unread}
      />
      <div className="min-w-0">
        {tab === "profile" && <ProfileTab user={user} />}
        {tab === "apps" && (
          <div>
            <div className="mb-2.5 flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-display text-xl font-bold text-[var(--text)]">
                {t("nav.apps")}
              </h2>
              <a
                href={`/${locale}#quiz`}
                className="inline-flex items-center rounded-[var(--radius-sm)] bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--primary-2)]"
              >
                + {t("apps.submit")}
              </a>
            </div>
            <ApplicationsList apps={apps} loading={loading} />
          </div>
        )}
        {tab === "docs" && <DocsTab />}
        {tab === "notif" && <NotifTab apps={apps} />}
        {tab === "support" && <SupportTab />}
      </div>
    </div>
  );
}

function GuestPrompt({
  onLogin,
  t,
  locale,
}: {
  onLogin: () => void;
  t: ReturnType<typeof useTranslations>;
  locale: string;
}) {
  return (
    <div className="mx-auto max-w-[480px] px-4 py-16 text-center">
      <h1 className="font-display text-2xl font-bold text-[var(--text)]">
        {t("guard.title")}
      </h1>
      <p className="mx-auto mt-2 max-w-[360px] text-sm text-[var(--text-3)]">
        {t("guard.text")}
      </p>
      <div className="mt-6 flex justify-center gap-3">
        <button
          type="button"
          onClick={onLogin}
          className="rounded-[var(--radius-sm)] bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--primary-2)]"
        >
          {t("guard.login")}
        </button>
        <a
          href={`/${locale}`}
          className="rounded-[var(--radius-sm)] border border-[var(--border)] px-5 py-2.5 text-sm font-medium text-[var(--text-2)] hover:border-[var(--primary)]"
        >
          {t("guard.home")}
        </a>
      </div>
    </div>
  );
}
