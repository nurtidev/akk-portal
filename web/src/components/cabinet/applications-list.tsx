"use client";

// =====================================================
// ===== D3: список заявок кабинета ====================
// Сводка (заявок/одобрено/запрошено), карточки со статус-пилюлями,
// пустое состояние с CTA «Подобрать программу». Эталон — renderAppsTab/renderApps.
// =====================================================

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { APP_STAGES, appStageIndex, rejectLabel } from "@/lib/api";
import type { Application } from "@/lib/api";
import { fmtMoney, fmtMoneyShort, programTitle } from "./helpers";
import { StatusBadge } from "./status-badge";

interface ApplicationsListProps {
  apps: Application[];
  loading: boolean;
}

export function ApplicationsList({ apps, loading }: ApplicationsListProps) {
  const t = useTranslations("cabinet");
  const pathname = usePathname();
  const locale = pathname.split("/")[1] || "ru";

  if (loading) {
    return (
      <p className="text-sm text-[var(--text-3)]">{t("apps.loading")}</p>
    );
  }

  if (!apps.length) {
    return <EmptyApps locale={locale} />;
  }

  // Сводка (как appsSummary в легаси).
  let approved = 0;
  let sum = 0;
  for (const a of apps) {
    if (rejectLabel(a.status)) continue;
    const idx = appStageIndex(a.status);
    if (idx >= 3) approved++;
    if (idx < APP_STAGES.length - 1) sum += a.amount || 0;
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2.5">
        <Stat label={t("apps.statTotal")} value={String(apps.length)} />
        <Stat label={t("apps.statApproved")} value={String(approved)} />
        <Stat label={t("apps.statRequested")} value={fmtMoneyShort(sum)} />
      </div>
      <div className="flex flex-col gap-2.5">
        {apps.map((a) => (
          <Link
            key={a.uid}
            href={`/${locale}/cabinet/applications/${a.uid}`}
            className="block rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-4 transition-all hover:border-[var(--primary)] hover:shadow-[var(--shadow)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
          >
            <div className="flex items-center justify-between gap-2.5">
              <strong className="text-sm text-[var(--text)]">
                № {a.number}
              </strong>
              <StatusBadge app={a} />
            </div>
            <div className="mt-2 flex items-baseline justify-between gap-2.5">
              <span className="text-[13px] text-[var(--text-3)]">
                {programTitle(a.program_id)}
              </span>
              <span className="text-sm font-bold text-[var(--text)]">
                {fmtMoney(a.amount)}
              </span>
            </div>
            <div className="mt-2.5 text-[12.5px] font-semibold text-[var(--primary)]">
              {t("apps.open")} →
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-[110px] flex-1 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2.5">
      <div className="text-[11px] text-[var(--text-3)]">{label}</div>
      <div className="mt-0.5 text-[17px] font-bold text-[var(--text)]">
        {value}
      </div>
    </div>
  );
}

function EmptyApps({ locale }: { locale: string }) {
  const t = useTranslations("cabinet");
  return (
    <div className="rounded-[var(--radius-lg)] border border-dashed border-[var(--border)] bg-[var(--surface-warm)] px-4 py-9 text-center">
      <svg
        width="120"
        height="86"
        viewBox="0 0 120 86"
        fill="none"
        className="mx-auto"
        aria-hidden="true"
      >
        <circle cx="92" cy="24" r="14" fill="#37b24d" opacity="0.14" />
        <circle cx="92" cy="24" r="7" fill="#37b24d" opacity="0.45" />
        <path d="M10 66h100" stroke="#9fc3ab" strokeWidth="2" strokeLinecap="round" />
        <g stroke="#2b8a3e" strokeWidth="2.2" strokeLinecap="round" fill="none">
          <path d="M38 66V48" />
          <path d="M38 55c-6-2-9-8-9-8M38 53c5-2 8-7 8-7" />
          <path d="M60 66V42" />
          <path d="M60 51c-7-2-10-9-10-9M60 49c6-2 10-8 10-8" />
          <path d="M82 66V51" />
          <path d="M82 57c-6-2-8-6-8-6M82 55c5-2 7-6 7-6" />
        </g>
      </svg>
      <div className="mt-3 text-[15px] font-bold text-[var(--text)]">
        {t("apps.emptyTitle")}
      </div>
      <p className="mx-auto mt-1.5 mb-4 max-w-[340px] text-sm text-[var(--text-3)]">
        {t("apps.emptyText")}
      </p>
      <Link
        href={`/${locale}#quiz`}
        className="inline-flex items-center rounded-[var(--radius-sm)] bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--primary-2)]"
      >
        {t("apps.emptyCta")}
      </Link>
    </div>
  );
}
