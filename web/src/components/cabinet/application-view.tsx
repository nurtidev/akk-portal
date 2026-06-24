"use client";

// =====================================================
// ===== D4: страница заявки (5-этапный трекер) =========
// Упрощённый степпер из 5 этапов заёмщика (stageOf), терминальный баннер
// (отклонена/отменена/закрыта), отмена заявки заёмщиком (can_cancel из
// GET /applications/:uid/status → POST /applications/:uid/cancel).
// Каталог документов мягко деградирует (у creditapp нет /documents).
// =====================================================

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  cancelApplication,
  getApplicationStatus,
  listApplications,
  listDocuments,
  type Application,
  type ApplicationStatus,
  type DocStage,
  type DocumentsDTO,
} from "@/lib/api";
import { stageOf, type StageInfo } from "@/lib/credit/stage";
import { useAuth } from "@/components/auth/auth-provider";
import { AuthModal } from "@/components/auth/auth-modal";
import { fmtMoney, programCategory, programTitle } from "./helpers";
import { SimpleStepper } from "./simple-stepper";
import { DocRow } from "./doc-row";

/** Цвета терминального баннера по типу. */
const TERMINAL_STYLE: Record<
  NonNullable<StageInfo["terminal"]>,
  { bg: string; border: string; text: string; icon: string }
> = {
  rejected: { bg: "rgba(214,51,108,0.08)", border: "#d6336c", text: "#d6336c", icon: "✕" },
  cancelled: { bg: "var(--surface-warm)", border: "var(--border-strong)", text: "var(--text-2)", icon: "—" },
  closed: { bg: "var(--surface-warm)", border: "var(--border-strong)", text: "var(--text-2)", icon: "•" },
};

export function ApplicationView({ uid }: { uid: string }) {
  const t = useTranslations("cabinet");
  const { user, ready, openAuth } = useAuth();
  const pathname = usePathname();
  const locale = pathname.split("/")[1] || "ru";

  const [app, setApp] = useState<Application | null>(null);
  const [status, setStatus] = useState<ApplicationStatus | null>(null);
  const [docs, setDocs] = useState<DocumentsDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [notice, setNotice] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    // Заявка приходит из списка (отдельного GET по uid в прототипе нет).
    const listR = await listApplications();
    const found =
      listR.ok && Array.isArray(listR.data)
        ? listR.data.find((a) => a.uid === uid) || null
        : null;
    setApp(found);

    if (found) {
      // Статус — источник правды для трекера и кнопки отмены.
      const statR = await getApplicationStatus(uid);
      setStatus(statR.ok && statR.data ? statR.data : null);

      // Документы у creditapp отсутствуют → мягкая деградация (каталог скрыт).
      const docR = await listDocuments(uid);
      setDocs(docR.ok && docR.data ? docR.data : null);
    }
    setLoading(false);
  }, [uid]);

  useEffect(() => {
    if (user) void load();
  }, [user, load]);

  async function doCancel() {
    setConfirmOpen(false);
    setCancelling(true);
    setNotice(null);
    const r = await cancelApplication(uid);
    setCancelling(false);

    if (r.ok) {
      setNotice({ kind: "ok", text: t("appx.cancelOk") });
      // Отмена асинхронная: workflow сменит статус на cancelled_* через 1-2 сек.
      setTimeout(() => void load(), 1500);
      return;
    }
    if (r.status === 409) {
      setNotice({ kind: "err", text: t("appx.cancelTooLate") });
      void load();
      return;
    }
    setNotice({ kind: "err", text: t("appx.cancelErr") });
  }

  const back = (
    <Link
      href={`/${locale}/cabinet?tab=apps`}
      className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-[var(--text-2)] hover:text-[var(--primary)]"
    >
      ← {t("appx.back")}
    </Link>
  );

  if (ready && !user) {
    return (
      <div className="mx-auto max-w-[760px] px-4 py-16 text-center">
        <p className="mb-4 text-sm text-[var(--text-3)]">{t("guard.text")}</p>
        <button
          type="button"
          onClick={() => openAuth("login")}
          className="rounded-[var(--radius-sm)] bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[var(--primary-2)]"
        >
          {t("guard.login")}
        </button>
        <AuthModal />
      </div>
    );
  }

  if (loading || !user) {
    return (
      <div className="mx-auto max-w-[760px] px-4 py-8">
        {back}
        <p className="text-sm text-[var(--text-3)]">{t("appx.loading")}</p>
      </div>
    );
  }

  if (!app) {
    return (
      <div className="mx-auto max-w-[760px] px-4 py-8">
        {back}
        <p className="text-sm text-[var(--text-3)]">{t("appx.notFound")}</p>
      </div>
    );
  }

  // Источник правды трекера — workflow_status из /status; fallback — статус из списка.
  const workflowStatus = status?.workflow_status || app.status;
  const stage = stageOf(workflowStatus);
  const terminal = stage.terminal;
  // «Завершено» — это активный статус completed*/monitoring* (этап 5, не терминал).
  const isDone =
    !terminal &&
    stage.index === 5 &&
    /^(completed|monitoring|issued|disbursed|disbursement_completed)/.test(workflowStatus || "");

  const canCancel = status?.can_cancel === true;

  const pid = app.program_id || "";
  const cat = programCategory(pid);

  // Группировка этапов с документами (если creditapp когда-нибудь начнёт их слать).
  const docStages: DocStage[] = docs?.stages || [];
  const hasDocs = docStages.some((s) => s.documents && s.documents.length > 0);

  return (
    <div className="mx-auto max-w-[760px] px-4 py-7">
      {back}

      {/* Шапка заявки */}
      <div className="mb-4 overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)]">
        <div className="relative h-32 bg-gradient-to-br from-[#07663D] to-[#054E2E]">
          <div className="ornament-tile pointer-events-none absolute inset-0 opacity-10" aria-hidden="true" />
          <div className="absolute inset-x-4 bottom-3 text-white">
            <h2 className="font-display text-xl font-bold text-white">{programTitle(pid)}</h2>
            {cat && <div className="text-xs opacity-90">{cat}</div>}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3.5 text-[13px] text-[var(--text-3)]">
          <span>
            {t("appx.application")}{" "}
            <b className="font-semibold text-[var(--text)]">№ {app.number}</b>
          </span>
          <span>
            {t("appx.amount")}{" "}
            <b className="font-semibold text-[var(--text)]">{fmtMoney(app.amount)}</b>
          </span>
          {!terminal && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--primary-soft)] px-3 py-1 text-xs font-bold text-[var(--primary)]">
              ● {isDone ? t("appx.stageDone") : stage.label}
            </span>
          )}
        </div>
      </div>

      {/* Терминальный баннер */}
      {terminal && (
        <div
          className="mb-3.5 flex items-start gap-3 rounded-[var(--radius-lg)] border p-4"
          style={{
            background: TERMINAL_STYLE[terminal].bg,
            borderColor: TERMINAL_STYLE[terminal].border,
          }}
        >
          <span
            className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
            style={{ background: TERMINAL_STYLE[terminal].border }}
          >
            {TERMINAL_STYLE[terminal].icon}
          </span>
          <div>
            <div
              className="text-sm font-bold"
              style={{ color: TERMINAL_STYLE[terminal].text }}
            >
              {stage.label}
            </div>
            <p className="mt-0.5 text-[13px] text-[var(--text-3)]">{t("appx.closed")}</p>
          </div>
        </div>
      )}

      {/* Трекер 5 этапов */}
      <Card title={t("appx.movement")}>
        <SimpleStepper currentIndex={stage.index} done={isDone} dim={!!terminal} />
        {/* Технический статус — мелким серым (опционально). */}
        {workflowStatus && (
          <div className="mt-3 text-[11px] text-[var(--text-3)]">
            {t("appx.currentStep")}: <span className="font-mono">{workflowStatus}</span>
          </div>
        )}
      </Card>

      {/* Каталог документов — мягкая деградация: показываем только при наличии данных */}
      {!terminal && hasDocs && (
        <>
          <div className="mb-2 mt-1.5 text-[13px] font-bold text-[var(--text)]">
            {t("appx.docsTitle")}
          </div>
          {docStages
            .filter((s) => s.documents && s.documents.length > 0)
            .map((s) => (
              <DocStageCollapsed key={s.status_key} stage={s} />
            ))}
        </>
      )}

      {/* Отмена заявки — только когда бэкенд разрешает (can_cancel) */}
      {canCancel && !terminal && (
        <div className="mt-3.5 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4">
          <div className="mb-1 text-[13px] font-bold text-[var(--text)]">
            {t("appx.cancelTitle")}
          </div>
          <p className="mb-2.5 text-[11.5px] text-[var(--text-3)]">{t("appx.cancelNote")}</p>
          {notice && (
            <p
              className="mb-2 text-sm"
              style={{ color: notice.kind === "ok" ? "var(--primary)" : "var(--danger)" }}
            >
              {notice.text}
            </p>
          )}
          <button
            type="button"
            disabled={cancelling}
            onClick={() => setConfirmOpen(true)}
            className="rounded-[var(--radius-sm)] border border-[var(--border)] px-3.5 py-2 text-xs font-semibold text-[var(--danger)] hover:border-[var(--danger)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {cancelling ? t("appx.cancelling") : t("appx.cancelBtn")}
          </button>
        </div>
      )}

      {/* Сообщение об успехе/ошибке отмены, когда блок отмены уже скрыт (после отмены) */}
      {!canCancel && notice && (
        <p
          className="mt-3 text-sm"
          style={{ color: notice.kind === "ok" ? "var(--primary)" : "var(--danger)" }}
        >
          {notice.text}
        </p>
      )}

      {/* Диалог подтверждения отмены */}
      {confirmOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setConfirmOpen(false)}
        >
          <div
            className="w-full max-w-[400px] rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-2 text-base font-bold text-[var(--text)]">
              {t("appx.confirmTitle")}
            </h3>
            <p className="mb-4 text-sm text-[var(--text-3)]">{t("appx.confirmText")}</p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                className="rounded-[var(--radius-sm)] border border-[var(--border)] px-3.5 py-2 text-sm font-semibold text-[var(--text-2)] hover:border-[var(--primary)]"
              >
                {t("appx.confirmNo")}
              </button>
              <button
                type="button"
                onClick={() => void doCancel()}
                className="rounded-[var(--radius-sm)] bg-[var(--danger)] px-3.5 py-2 text-sm font-semibold text-white hover:opacity-90"
              >
                {t("appx.confirmYes")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Card({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="mb-3.5 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4">
      {title && (
        <div className="mb-1 text-[13px] font-bold tracking-wide text-[var(--text)]">{title}</div>
      )}
      {children}
    </div>
  );
}

function DocStageCollapsed({ stage }: { stage: DocStage }) {
  const t = useTranslations("cabinet");
  return (
    <details className="mb-2.5 overflow-hidden rounded-[var(--radius)] border border-[var(--border-soft)] bg-[var(--surface-warm)]">
      <summary className="flex cursor-pointer list-none items-center gap-2.5 px-3.5 py-3 text-[13px] font-semibold text-[var(--text-2)] [&::-webkit-details-marker]:hidden">
        <span>{stage.label}</span>
        <span className="ml-auto text-[11px] text-[var(--text-3)]">
          {stage.documents.length} {t("appx.docsCount")}
        </span>
      </summary>
      <div className="px-3.5 pb-3 pt-1">
        {stage.documents.map((d) => (
          <DocRow key={d.requirement_key} doc={d} interactive={false} onUpload={() => {}} onSign={() => {}} />
        ))}
      </div>
    </details>
  );
}
