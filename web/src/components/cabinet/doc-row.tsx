"use client";

// =====================================================
// ===== D4: строка требования документа ===============
// Бейдж источника (gov/upload/sign), действие (загрузить/подписать) на текущем этапе,
// иначе — статус («ожидается»/«готово»). Перенос docRowHtml из легаси.
// =====================================================

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import type { AppDocument } from "@/lib/api";
import {
  DocDetailSheet,
  docSourceLine,
  type DocAction,
  type DocDetailData,
} from "./doc-detail-sheet";

interface DocRowProps {
  doc: AppDocument;
  /** Текущий этап — можно загружать/подписывать. */
  interactive: boolean;
  /** Загрузка файла (метаданные — имя файла). */
  onUpload: (requirementKey: string, fileName: string) => Promise<void> | void;
  /** Подписание ЭЦП (демо). */
  onSign: (requirementKey: string) => Promise<void> | void;
}

function isDone(doc: AppDocument): boolean {
  return doc.status === "verified" || doc.status === "uploaded";
}

/** Ярлык + цвет статуса требования для карточки документа. */
function appStatusMeta(
  doc: AppDocument,
  t: ReturnType<typeof useTranslations>,
): { label: string; color: string } {
  if (doc.needs_refresh)
    return { label: t("docDetail.stRefresh"), color: "#C9A21C" };
  if (doc.status === "verified")
    return { label: t("docDetail.stVerified"), color: "#2b8a3e" };
  if (doc.status === "uploaded")
    return { label: t("docDetail.stUploaded"), color: "#2b8a3e" };
  return { label: t("docDetail.stRequired"), color: "#868e96" };
}

export function DocRow({ doc, interactive, onUpload, onSign }: DocRowProps) {
  const t = useTranslations("cabinet");
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);

  const done = isDone(doc);

  async function handleSign() {
    setBusy(true);
    await onSign(doc.requirement_key);
    setBusy(false);
    setOpen(false);
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setBusy(true);
    await onUpload(doc.requirement_key, f.name);
    setBusy(false);
    setOpen(false);
  }

  // Подзаголовок строки: откуда документ (провенанс) + имя файла.
  const subtitle = [docSourceLine(t, doc.source, doc.provenance), doc.file_name]
    .filter(Boolean)
    .join(" · ");

  const meta = appStatusMeta(doc, t);
  const detail: DocDetailData = {
    title: doc.title,
    source: doc.source,
    provenance: doc.provenance,
    statusLabel: meta.label,
    statusColor: meta.color,
    fileName: doc.file_name,
    validUntil: doc.valid_until,
  };
  // Действие в карточке доступно только на текущем этапе и пока не закрыто.
  const action: DocAction | undefined =
    interactive && !done
      ? doc.source === "sign"
        ? { label: t("appx.sign"), busy, onClick: () => void handleSign() }
        : { label: t("appx.upload"), busy, onClick: () => fileRef.current?.click() }
      : undefined;

  // Мобайл: название+бейдж в строку, действие — отдельной строкой на всю ширину
  // (палец попадает); ≥sm — прежняя одна строка.
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-[var(--border-soft)] py-3 first:border-t-0 sm:flex-nowrap sm:py-2.5">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="min-w-0 flex-1 text-left"
        aria-label={t("docDetail.detailsAria")}
      >
        <div className="text-[13.5px] text-[var(--text)]">{doc.title}</div>
        {subtitle && (
          <div className="mt-0.5 truncate text-[11.5px] text-[var(--text-3)]">
            {subtitle}
          </div>
        )}
      </button>

      <DocBadge source={doc.source} t={t} />

      <div className="w-full flex-shrink-0 sm:w-auto">
        {done ? (
          <span className="inline-flex h-[18px] w-[18px] items-center justify-center rounded-full bg-[var(--primary)] text-[11px] text-white">
            ✓
          </span>
        ) : !interactive ? (
          <span className="rounded-full bg-[var(--border-soft)] px-2 py-0.5 text-[10.5px] font-bold text-[var(--text-3)]">
            {t("appx.awaited")}
          </span>
        ) : doc.source === "sign" ? (
          <button
            type="button"
            onClick={handleSign}
            disabled={busy}
            className="w-full whitespace-nowrap rounded-[var(--radius-sm)] bg-[var(--primary)] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[var(--primary-2)] disabled:opacity-60 sm:w-auto sm:px-3 sm:py-1.5 sm:text-xs"
          >
            {busy ? "…" : t("appx.sign")}
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={busy}
              className="w-full whitespace-nowrap rounded-[var(--radius-sm)] bg-[var(--primary)] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[var(--primary-2)] disabled:opacity-60 sm:w-auto sm:px-3 sm:py-1.5 sm:text-xs"
            >
              {busy ? "…" : t("appx.upload")}
            </button>
            <input
              ref={fileRef}
              type="file"
              className="hidden"
              onChange={handleFile}
            />
          </>
        )}
      </div>

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

function DocBadge({
  source,
  t,
}: {
  source: AppDocument["source"];
  t: ReturnType<typeof useTranslations>;
}) {
  const map: Record<AppDocument["source"], { label: string; cls: string }> = {
    gov: { label: t("appx.badgeGov"), cls: "bg-[#e7f0fb] text-[#1c6fd6]" },
    upload: { label: t("appx.badgeUpload"), cls: "bg-[#fff4e2] text-[#b9770a]" },
    sign: { label: t("appx.badgeSign"), cls: "bg-[#efeaff] text-[#6741d9]" },
  };
  const b = map[source];
  return (
    <span
      className={`flex-shrink-0 rounded-full px-2.5 py-0.5 text-[10.5px] font-bold ${b.cls}`}
    >
      {b.label}
    </span>
  );
}
