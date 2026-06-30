"use client";

// =====================================================
// ===== D4: карточка документа («провалиться внутрь») ==
// Модалка с деталями документа: поимённый источник (провенанс), статус,
// сроки, превью файла и действие (прикрепить/заменить/подписать).
// Переиспользуется из «Моих документов» (VaultRow) и заявки (DocRow).
// =====================================================

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

export type DocSource = "gov" | "upload" | "sign";

/** Нормализованные данные документа для карточки (общие для vault и заявки). */
export interface DocDetailData {
  title: string;
  source: DocSource;
  /** Поимённый источник для gov (КГД/ПКБ/ГБД ФЛ/…). */
  provenance?: string;
  /** Локализованный ярлык статуса. */
  statusLabel: string;
  /** Цвет статуса (hex или CSS-переменная). */
  statusColor: string;
  fileName?: string | null;
  /** YYYY-MM-DD */
  issuedAt?: string;
  /** YYYY-MM-DD (нет для бессрочных). */
  validUntil?: string;
  /** 0 = бессрочно. */
  validityDays?: number;
  /** true → есть реальный загруженный файл (показываем превью). */
  hasFile?: boolean;
  /** MIME файла (application/pdf, image/*). */
  contentType?: string;
  /** Лоадер object URL файла (с Bearer); вызывается при наличии hasFile. */
  loadPreview?: () => Promise<string | null>;
}

/** Кнопка действия внутри карточки (прикрепить/заменить/подписать). */
export interface DocAction {
  label: string;
  onClick: () => void;
  busy?: boolean;
}

const SOURCE_STYLE: Record<DocSource, { color: string; bg: string }> = {
  gov: { color: "#1c6fd6", bg: "#e7f0fb" },
  upload: { color: "#b9770a", bg: "#fff4e2" },
  sign: { color: "#6741d9", bg: "#efeaff" },
};

/** Короткая строка-провенанс для строки списка: «Получено из КГД» / «Загружено вами» / «Подписывается через ЭЦП». */
export function docSourceLine(
  t: ReturnType<typeof useTranslations>,
  source: DocSource,
  provenance?: string,
): string {
  if (source === "gov") {
    return provenance
      ? t("docDetail.govFrom", { source: provenance })
      : t("appx.badgeGov");
  }
  if (source === "sign") return t("docDetail.toSign");
  return t("docDetail.uploadedBy");
}

export function DocDetailSheet({
  data,
  action,
  onClose,
}: {
  data: DocDetailData;
  action?: DocAction;
  onClose: () => void;
}) {
  const t = useTranslations("cabinet");
  const s = SOURCE_STYLE[data.source];

  // Object URL реального файла (для upload-документов с загруженным файлом).
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [loadingFile, setLoadingFile] = useState(false);

  useEffect(() => {
    if (!data.hasFile || !data.loadPreview) return;
    let url: string | null = null;
    let alive = true;
    setLoadingFile(true);
    data
      .loadPreview()
      .then((u) => {
        url = u;
        if (alive) setFileUrl(u);
      })
      .finally(() => {
        if (alive) setLoadingFile(false);
      });
    return () => {
      alive = false;
      if (url) URL.revokeObjectURL(url);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.hasFile]);
  const kindLabel =
    data.source === "gov"
      ? t("appx.badgeGov")
      : data.source === "sign"
        ? t("appx.badgeSign")
        : t("appx.badgeUpload");

  const validity =
    data.validityDays === 0
      ? t("vault.permanent")
      : data.validUntil
        ? t("vault.until", { date: data.validUntil })
        : null;

  // Текст превью зависит от природы документа.
  let preview: string;
  if (data.source === "gov") {
    preview = t("docDetail.previewGov", { source: data.provenance || kindLabel });
  } else if (data.source === "sign") {
    preview = t("docDetail.previewSign");
  } else if (data.fileName) {
    preview = t("docDetail.previewUpload", { name: data.fileName });
  } else {
    preview = t("docDetail.previewUploadEmpty");
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 px-0 sm:items-center sm:px-4"
      role="dialog"
      aria-modal="true"
      aria-label={data.title}
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-[460px] overflow-y-auto rounded-t-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] sm:rounded-[var(--radius-lg)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Шапка: бейдж источника + закрыть */}
        <div className="flex items-center gap-2 border-b border-[var(--border-soft)] px-4 py-3">
          <span
            className="rounded-full px-2.5 py-0.5 text-[11px] font-bold"
            style={{ background: s.bg, color: s.color }}
          >
            {kindLabel}
          </span>
          <span className="truncate text-[11.5px] text-[var(--text-3)]">
            {docSourceLine(t, data.source, data.provenance)}
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("docDetail.close")}
            className="ml-auto flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-[var(--text-3)] hover:bg-[var(--surface-warm)] hover:text-[var(--text)]"
          >
            ✕
          </button>
        </div>

        <div className="px-4 py-4">
          <h3 className="font-display text-lg font-bold leading-snug text-[var(--text)]">
            {data.title}
          </h3>

          {/* Превью: реальный файл, если загружен; иначе — пояснение откуда документ */}
          {data.hasFile ? (
            <div className="mt-3 overflow-hidden rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface-warm)]">
              {loadingFile ? (
                <div className="flex h-40 items-center justify-center text-[12.5px] text-[var(--text-3)]">
                  {t("docDetail.loadingPreview")}
                </div>
              ) : fileUrl && data.contentType?.startsWith("image/") ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={fileUrl}
                  alt={data.fileName || data.title}
                  className="max-h-[420px] w-full bg-white object-contain"
                />
              ) : fileUrl && data.contentType === "application/pdf" ? (
                <iframe
                  src={fileUrl}
                  title={data.fileName || data.title}
                  className="h-[420px] w-full bg-white"
                />
              ) : (
                <div className="flex h-40 items-center justify-center text-[12.5px] text-[var(--text-3)]">
                  {t("docDetail.previewUnavailable")}
                </div>
              )}
              {fileUrl && (
                <a
                  href={fileUrl}
                  download={data.fileName || undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 border-t border-[var(--border-soft)] py-2 text-[12.5px] font-semibold text-[var(--primary)] hover:bg-[var(--surface)]"
                >
                  ↓ {t("docDetail.openFile")}
                </a>
              )}
            </div>
          ) : (
            <div className="mt-3 flex gap-3 rounded-[var(--radius)] border border-dashed border-[var(--border)] bg-[var(--surface-warm)] p-3.5">
              <svg
                width="34"
                height="34"
                viewBox="0 0 24 24"
                fill="none"
                stroke={s.color}
                strokeWidth="1.6"
                className="flex-shrink-0"
                aria-hidden="true"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <path d="M14 2v6h6" />
              </svg>
              <p className="text-[12.5px] leading-relaxed text-[var(--text-2)]">
                {preview}
              </p>
            </div>
          )}

          {/* Мета-строки */}
          <dl className="mt-3.5 space-y-2">
            <MetaRow label={t("docDetail.statusLabel")}>
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-bold"
                style={{
                  background: data.statusColor + "14",
                  color: data.statusColor,
                  border: "1px solid " + data.statusColor + "40",
                }}
              >
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ background: data.statusColor }}
                />
                {data.statusLabel}
              </span>
            </MetaRow>
            <MetaRow label={t("docDetail.sourceLabel")}>
              {data.provenance || kindLabel}
            </MetaRow>
            {data.issuedAt && (
              <MetaRow label={t("docDetail.received")}>{data.issuedAt}</MetaRow>
            )}
            {validity && (
              <MetaRow label={t("docDetail.validityLabel")}>{validity}</MetaRow>
            )}
            {data.fileName && (
              <MetaRow label={t("docDetail.fileLabel")}>{data.fileName}</MetaRow>
            )}
          </dl>

          {/* Действие */}
          {action && (
            <button
              type="button"
              disabled={action.busy}
              onClick={action.onClick}
              className="mt-4 w-full rounded-[var(--radius-sm)] bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[var(--primary-2)] disabled:opacity-60"
            >
              {action.busy ? "…" : action.label}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function MetaRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 text-[12.5px]">
      <dt className="text-[var(--text-3)]">{label}</dt>
      <dd className="text-right font-semibold text-[var(--text)]">{children}</dd>
    </div>
  );
}
