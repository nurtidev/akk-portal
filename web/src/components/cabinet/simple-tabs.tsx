"use client";

// =====================================================
// ===== D3: вкладки Документы / Уведомления / Поддержка
// Эталон — renderDocsTab/renderNotifTab/renderSupportTab (__auth-integration.js).
// Уведомления генерируются из статусов заявок.
// =====================================================

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  APP_STAGES,
  listMyDocuments,
  uploadMyDocumentFile,
  fetchMyDocumentObjectUrl,
  extractMyDocumentFields,
  signMyDocument,
  markNotificationsRead,
} from "@/lib/api";
import type { MyDocument, NotificationItem } from "@/lib/api";
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

  const sign = useCallback(
    async (key: string, method: "ecp" | "sms") => {
      setBusy(key);
      const r = await signMyDocument(key, method);
      setBusy(null);
      void load();
      return r.ok;
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
              onSign={sign}
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
  onSign,
  t,
}: {
  doc: MyDocument;
  busy: boolean;
  onAttach: (key: string, file: File) => void;
  onSign: (key: string, method: "ecp" | "sms") => Promise<boolean>;
  t: ReturnType<typeof useTranslations>;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const meta = vaultStatusMeta(doc.status, t);
  const isGov = doc.source === "gov";
  const isSign = doc.source === "sign";

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
    extract: () =>
      extractMyDocumentFields(doc.key).then((r) => (r.ok ? r.data : null)),
    signMethod: doc.sign_method,
    onSign: isSign
      ? async (method) => {
          const ok = await onSign(doc.key, method);
          if (ok) setOpen(false);
          return ok;
        }
      : undefined,
  };
  // Кнопка загрузки — только для upload-документов (gov подтягивается сам, sign — подписывается).
  const action: DocAction | undefined =
    isGov || isSign
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
      ) : isSign ? (
        // Sign-документ: открыть карточку, где выбор ЭЦП / SMS (или статус подписи).
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-[var(--radius-sm)] border border-[var(--border)] px-2.5 py-1 text-[11px] font-semibold text-[var(--primary)] hover:border-[var(--primary)]"
        >
          {doc.status === "missing" ? t("vault.sign") : t("vault.signed")}
        </button>
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

const notifColor: Record<NotificationItem["kind"], string> = {
  ok: "#2b8a3e",
  info: "#1c6fd6",
  danger: "#d6336c",
};

/** Локализованные заголовок/текст уведомления по коду (i18n сохранён). */
function notifText(
  n: NotificationItem,
  t: ReturnType<typeof useTranslations>,
): { title: string; text: string } {
  const num = n.application_number ?? "";
  switch (n.code) {
    case "application_rejected":
      return { title: t("notif.rejected", { num }), text: n.text };
    case "application_stage":
      return {
        title: t("notif.appNum", { num }),
        text: t("notif.currentStage", { stage: APP_STAGES[n.stage_index ?? 0] ?? "" }),
      };
    case "application_accepted":
      return { title: t("notif.accepted", { num }), text: t("notif.govPulled") };
    case "profile_ok":
      return { title: t("notif.profileOk"), text: t("notif.profileOkText") };
    default:
      return { title: n.title, text: n.text };
  }
}

export function NotifTab({
  items,
  onRead,
}: {
  items: NotificationItem[];
  onRead: () => void;
}) {
  const t = useTranslations("cabinet");

  // Открытие вкладки = просмотр: помечаем прочитанными (счётчик в сайдбаре → 0).
  useEffect(() => {
    let alive = true;
    void markNotificationsRead().then(() => {
      if (alive) onRead();
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <h2 className="font-display text-xl font-bold text-[var(--text)]">
        {t("nav.notif")}
      </h2>
      <div className="mt-3 overflow-hidden rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)]">
        {items.map((n, i) => {
          const { title, text } = notifText(n, t);
          const c = notifColor[n.kind];
          return (
            <div
              key={i}
              className={`flex gap-3 px-3.5 py-3 ${i ? "border-t border-[var(--border-soft)]" : ""}`}
              style={n.unread ? { background: c + "0e" } : undefined}
            >
              <span
                className="mt-1.5 h-2.5 w-2.5 flex-shrink-0 rounded-full"
                style={{ background: n.unread ? c : "var(--border-strong)" }}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <div className="text-[13.5px] font-semibold text-[var(--text)]">
                    {title}
                  </div>
                  {n.unread && (
                    <span
                      className="flex-shrink-0 rounded-full px-1.5 py-0.5 text-[9.5px] font-bold uppercase"
                      style={{ background: c + "1f", color: c }}
                    >
                      {t("notif.new")}
                    </span>
                  )}
                </div>
                <div className="mt-0.5 text-[12.5px] text-[var(--text-3)]">{text}</div>
              </div>
            </div>
          );
        })}
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
