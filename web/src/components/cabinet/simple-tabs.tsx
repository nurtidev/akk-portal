"use client";

// =====================================================
// ===== D3: вкладки Документы / Уведомления / Поддержка
// Эталон — renderDocsTab/renderNotifTab/renderSupportTab (__auth-integration.js).
// Уведомления генерируются из статусов заявок.
// =====================================================

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  appStageIndex,
  APP_STAGES,
  rejectLabel,
  listMyDocuments,
  uploadMyDocumentFile,
  fetchMyDocumentObjectUrl,
} from "@/lib/api";
import type { Application, MyDocument } from "@/lib/api";
import {
  DocDetailSheet,
  docSourceLine,
  type DocAction,
  type DocDetailData,
} from "./doc-detail-sheet";

// --- Мои документы (личное хранилище: переиспользование + сроки действия) --

/** Цвет/ярлык статуса документа хранилища. */
function vaultStatusMeta(
  status: MyDocument["status"],
  t: ReturnType<typeof useTranslations>,
): { label: string; color: string } {
  switch (status) {
    case "valid":
      return { label: t("vault.statusValid"), color: "#2b8a3e" };
    case "expiring":
      return { label: t("vault.statusExpiring"), color: "#C9A21C" };
    case "expired":
      return { label: t("vault.statusExpired"), color: "#d6336c" };
    default:
      return { label: t("vault.statusMissing"), color: "#868e96" };
  }
}

export function DocsTab() {
  const t = useTranslations("cabinet");
  const [docs, setDocs] = useState<MyDocument[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const r = await listMyDocuments();
    setDocs(r.ok && Array.isArray(r.data) ? r.data : []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const attach = useCallback(
    async (key: string, file: File) => {
      setBusy(key);
      await uploadMyDocumentFile(key, file);
      setBusy(null);
      void load();
    },
    [load],
  );

  return (
    <div>
      <h2 className="font-display text-xl font-bold text-[var(--text)]">
        {t("vault.title")}
      </h2>
      <p className="mb-3.5 mt-1 text-sm text-[var(--text-3)]">{t("vault.sub")}</p>

      {docs === null ? (
        <p className="text-sm text-[var(--text-3)]">{t("vault.loading")}</p>
      ) : (
        <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-3.5 py-1">
          {docs.map((d) => (
            <VaultRow
              key={d.key}
              doc={d}
              busy={busy === d.key}
              onAttach={attach}
              t={t}
            />
          ))}
        </div>
      )}
      <p className="mt-2.5 text-[11px] leading-relaxed text-[var(--text-3)]">
        {t("vault.note")}
      </p>
    </div>
  );
}

function VaultRow({
  doc,
  busy,
  onAttach,
  t,
}: {
  doc: MyDocument;
  busy: boolean;
  onAttach: (key: string, file: File) => void;
  t: ReturnType<typeof useTranslations>;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const meta = vaultStatusMeta(doc.status, t);
  const isGov = doc.source === "gov";

  // Подпись срока: бессрочно / действует до даты.
  const validity =
    doc.validity_days === 0
      ? t("vault.permanent")
      : doc.valid_until
        ? t("vault.until", { date: doc.valid_until })
        : "";

  // Подзаголовок строки: откуда документ (провенанс) + срок.
  const subtitle = [docSourceLine(t, doc.source, doc.provenance), validity]
    .filter(Boolean)
    .join(" · ");

  const detail: DocDetailData = {
    title: doc.title,
    source: doc.source,
    provenance: doc.provenance,
    statusLabel: meta.label,
    statusColor: meta.color,
    fileName: doc.file_name,
    issuedAt: doc.issued_at,
    validUntil: doc.valid_until,
    validityDays: doc.validity_days,
    hasFile: doc.has_file,
    contentType: doc.content_type,
    loadPreview: () => fetchMyDocumentObjectUrl(doc.key),
  };
  // Действие доступно только для загружаемых типов (gov подтягивается сам).
  const action: DocAction | undefined = isGov
    ? undefined
    : {
        label: doc.status === "missing" ? t("vault.attach") : t("vault.refresh"),
        busy,
        onClick: () => fileRef.current?.click(),
      };

  return (
    <div className="flex items-center gap-2.5 border-b border-[var(--border-soft)] py-2.5 last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
        aria-label={t("docDetail.detailsAria")}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="1.8" className="flex-shrink-0" aria-hidden="true">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <path d="M14 2v6h6" />
        </svg>
        <div className="min-w-0 flex-1">
          <div className="text-[12.5px] text-[var(--text)]">{doc.title}</div>
          {subtitle && (
            <div className="mt-0.5 truncate text-[11px] text-[var(--text-3)]">{subtitle}</div>
          )}
        </div>
      </button>

      <span
        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold whitespace-nowrap"
        style={{ background: meta.color + "14", color: meta.color, border: "1px solid " + meta.color + "40" }}
      >
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: meta.color }} />
        {meta.label}
      </span>

      {isGov ? (
        <SrcChip label={t("vault.gov")} color="#1c6fd6" />
      ) : (
        <>
          <input
            ref={fileRef}
            type="file"
            accept="application/pdf,image/jpeg,image/png"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onAttach(doc.key, f);
              e.target.value = "";
              setOpen(false);
            }}
          />
          <button
            type="button"
            disabled={busy}
            onClick={() => fileRef.current?.click()}
            className="rounded-[var(--radius-sm)] border border-[var(--border)] px-2.5 py-1 text-[11px] font-semibold text-[var(--primary)] hover:border-[var(--primary)] disabled:opacity-60"
          >
            {busy
              ? t("vault.loading")
              : doc.status === "missing"
                ? t("vault.attach")
                : t("vault.refresh")}
          </button>
        </>
      )}

      {open && (
        <DocDetailSheet
          data={detail}
          action={action}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}

// --- Уведомления ----------------------------------------------------------

interface NotifEvent {
  kind: "ok" | "info" | "danger";
  title: string;
  text: string;
}

/** Сборка ленты уведомлений из статусов заявок (как notifEvents в легаси). */
function buildNotifEvents(
  apps: Application[],
  t: ReturnType<typeof useTranslations>,
): NotifEvent[] {
  const ev: NotifEvent[] = [];
  for (const a of apps) {
    const rej = rejectLabel(a.status);
    if (rej) {
      ev.push({ kind: "danger", title: t("notif.rejected", { num: a.number }), text: rej });
    } else {
      const idx = appStageIndex(a.status);
      if (idx > 0) {
        ev.push({
          kind: "info",
          title: t("notif.appNum", { num: a.number }),
          text: t("notif.currentStage", { stage: APP_STAGES[idx] }),
        });
      }
    }
    ev.push({
      kind: "ok",
      title: t("notif.accepted", { num: a.number }),
      text: t("notif.govPulled"),
    });
  }
  if (!ev.length) {
    ev.push({ kind: "ok", title: t("notif.profileOk"), text: t("notif.profileOkText") });
  }
  return ev;
}

export function NotifTab({ apps }: { apps: Application[] }) {
  const t = useTranslations("cabinet");
  const ev = buildNotifEvents(apps, t);
  const color: Record<NotifEvent["kind"], string> = {
    ok: "#2b8a3e",
    info: "#1c6fd6",
    danger: "#d6336c",
  };
  return (
    <div>
      <h2 className="font-display text-xl font-bold text-[var(--text)]">
        {t("nav.notif")}
      </h2>
      <div className="mt-3 overflow-hidden rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)]">
        {ev.map((n, i) => (
          <div
            key={i}
            className={`flex gap-3 px-3.5 py-3 ${i ? "border-t border-[var(--border-soft)]" : ""}`}
          >
            <span
              className="mt-1.5 h-2.5 w-2.5 flex-shrink-0 rounded-full"
              style={{ background: color[n.kind] }}
            />
            <div className="min-w-0">
              <div className="text-[13.5px] font-semibold text-[var(--text)]">
                {n.title}
              </div>
              <div className="mt-0.5 text-[12.5px] text-[var(--text-3)]">{n.text}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- Поддержка ------------------------------------------------------------

export function SupportTab() {
  const t = useTranslations("cabinet");
  return (
    <div>
      <h2 className="font-display text-xl font-bold text-[var(--text)]">
        {t("nav.support")}
      </h2>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <InfoCard
          title={t("support.contactCenter")}
          chip={t("support.hours")}
          chipColor="#0c8577"
          rows={[
            [t("support.phone"), "1408"],
            [t("support.email"), "info@agrocredit.kz"],
            [t("support.site"), "agrocredit.kz"],
          ]}
        />
        <InfoCard
          title={t("support.faqTitle")}
          chip="FAQ"
          chipColor="#6741d9"
          rows={[
            [t("support.faqTerms"), t("support.faqTermsVal")],
            [t("support.faqDocs"), t("support.faqDocsVal")],
            [t("support.faqStatus"), t("support.faqStatusVal")],
          ]}
        />
      </div>
    </div>
  );
}

function InfoCard({
  title,
  chip,
  chipColor,
  rows,
}: {
  title: string;
  chip: string;
  chipColor: string;
  rows: [string, string][];
}) {
  return (
    <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-3.5">
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <strong className="text-[13px] text-[var(--text)]">{title}</strong>
        <SrcChip label={chip} color={chipColor} />
      </div>
      {rows.map((r, i) => (
        <div key={i} className="flex justify-between gap-3 py-0.5 text-[12.5px]">
          <span className="text-[var(--text-3)]">{r[0]}</span>
          <span className="text-right font-semibold text-[var(--text)]">{r[1]}</span>
        </div>
      ))}
    </div>
  );
}

function SrcChip({ label, color }: { label: string; color: string }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold whitespace-nowrap"
      style={{
        background: color + "14",
        color,
        border: "1px solid " + color + "40",
      }}
    >
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M20 6L9 17l-5-5" />
      </svg>
      {label}
    </span>
  );
}
