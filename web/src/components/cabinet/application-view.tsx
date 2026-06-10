"use client";

// =====================================================
// ===== D4: страница заявки (трекер + документы) ======
// Трекер 9 этапов / ветка отказа, «Что нужно сейчас», каталог требований
// по этапам (gov/upload/sign), демо-кнопки advance. Эталон — applicationHtml.
// =====================================================

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  advanceApplication,
  APP_STAGES,
  appStageIndex,
  listApplications,
  listDocuments,
  rejectLabel,
  uploadDocument,
  type Application,
  type DocStage,
  type DocumentsDTO,
} from "@/lib/api";
import { useAuth } from "@/components/auth/auth-provider";
import { AuthModal } from "@/components/auth/auth-modal";
import { fmtMoney, programCategory, programTitle } from "./helpers";
import { StageTimeline, RejectedTimeline } from "./stage-timeline";
import { DocRow } from "./doc-row";

export function ApplicationView({ uid }: { uid: string }) {
  const t = useTranslations("cabinet");
  const { user, ready, openAuth } = useAuth();
  const pathname = usePathname();
  const locale = pathname.split("/")[1] || "ru";

  const [app, setApp] = useState<Application | null>(null);
  const [docs, setDocs] = useState<DocumentsDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    // Заявка приходит из списка (отдельного GET по uid в прототипе нет).
    const listR = await listApplications();
    const found =
      listR.ok && Array.isArray(listR.data)
        ? listR.data.find((a) => a.uid === uid) || null
        : null;
    setApp(found);
    if (found) {
      const docR = await listDocuments(uid);
      setDocs(docR.ok && docR.data ? docR.data : null);
    }
    setLoading(false);
  }, [uid]);

  useEffect(() => {
    if (user) void load();
  }, [user, load]);

  async function advance(status?: string) {
    setError("");
    const r = await advanceApplication(uid, status);
    if (!r.ok) {
      setError(t("appx.advanceErr"));
      return;
    }
    await load();
  }

  async function doUpload(reqKey: string, fileName: string) {
    const r = await uploadDocument(uid, reqKey, fileName);
    if (r.ok) await load();
  }

  async function doSign(reqKey: string) {
    const r = await uploadDocument(uid, reqKey, `signed-${reqKey}.pdf`);
    if (r.ok) await load();
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

  const idx = appStageIndex(app.status);
  const rej = rejectLabel(app.status);
  const isFinal = idx >= APP_STAGES.length - 1;
  const pid = app.program_id || "";
  const cat = programCategory(pid);

  // Группировка этапов с документами на current / past / future.
  const stages: DocStage[] = docs?.stages || [];
  let current: DocStage | null = null;
  const past: DocStage[] = [];
  const future: DocStage[] = [];
  for (const s of stages) {
    if (!s.documents || !s.documents.length) {
      if (s.stage_index === idx) current = s;
      continue;
    }
    if (s.stage_index === idx) current = s;
    else if (s.stage_index < idx) past.push(s);
    else future.push(s);
  }

  return (
    <div className="mx-auto max-w-[760px] px-4 py-7">
      {back}

      {/* Шапка заявки */}
      <div className="mb-4 overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)]">
        <div className="relative h-32 bg-gradient-to-br from-[#07663D] to-[#054E2E]">
          <div className="ornament-tile pointer-events-none absolute inset-0 opacity-10" aria-hidden="true" />
          <div className="absolute inset-x-4 bottom-3 text-white">
            <h2 className="font-display text-xl font-bold text-white">
              {programTitle(pid)}
            </h2>
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
          {!rej && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--primary-soft)] px-3 py-1 text-xs font-bold text-[var(--primary)]">
              ● {APP_STAGES[idx]}
            </span>
          )}
        </div>
      </div>

      {/* Трекер */}
      <Card title={t("appx.movement")}>
        {rej ? (
          <RejectedTimeline reachedIdx={Math.min(idx, APP_STAGES.length - 1)} label={rej} />
        ) : (
          <StageTimeline
            currentIdx={idx}
            progressLabel={t("appx.progressOf", { n: Math.min(idx + 1, APP_STAGES.length), total: APP_STAGES.length })}
          />
        )}
      </Card>

      {rej ? (
        <Card>
          <p className="text-sm text-[var(--text-3)]">{t("appx.closed")}</p>
        </Card>
      ) : (
        <>
          {/* Что нужно сейчас */}
          <div className="mb-3.5 rounded-[var(--radius-lg)] border border-[var(--primary)] bg-[var(--primary-soft)] p-4">
            <div className="mb-1 text-[13px] font-bold text-[var(--text)]">
              {t("appx.nowTitle")} · {APP_STAGES[idx]}
            </div>
            {current && current.documents.length ? (
              current.documents.map((d) => (
                <DocRow
                  key={d.requirement_key}
                  doc={d}
                  interactive
                  onUpload={doUpload}
                  onSign={doSign}
                />
              ))
            ) : (
              <p className="text-sm text-[var(--text-3)]">{t("appx.nowEmpty")}</p>
            )}
          </div>

          {past.length > 0 && (
            <>
              <div className="mb-2 mt-1.5 text-[13px] font-bold text-[var(--text)]">
                {t("appx.passed")}
              </div>
              {past.map((s) => (
                <CollapsedStage key={s.status_key} stage={s} kind="past" />
              ))}
            </>
          )}
          {future.length > 0 && (
            <>
              <div className="mb-2 mt-1.5 text-[13px] font-bold text-[var(--text)]">
                {t("appx.ahead")}
              </div>
              {future.map((s) => (
                <CollapsedStage key={s.status_key} stage={s} kind="future" />
              ))}
            </>
          )}
        </>
      )}

      {/* Демо-управление */}
      <div className="mt-3.5 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-warm)] p-4">
        <div className="mb-1 text-[13px] font-bold text-[var(--text)]">
          {t("appx.demoTitle")}
        </div>
        <p className="mb-2.5 text-[11.5px] text-[var(--text-3)]">
          {t("appx.demoNote")}
        </p>
        {error && <p className="mb-2 text-sm text-[var(--danger)]">{error}</p>}
        <div className="flex flex-wrap gap-2">
          {!rej && !isFinal && (
            <>
              <button
                type="button"
                onClick={() => advance()}
                className="rounded-[var(--radius-sm)] bg-[var(--primary)] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[var(--primary-2)]"
              >
                {t("appx.advance")} →
              </button>
              <button
                type="button"
                onClick={() => advance("rejected")}
                className="rounded-[var(--radius-sm)] border border-[var(--border)] px-3 py-1.5 text-xs font-semibold text-[var(--danger)] hover:border-[var(--danger)]"
              >
                {t("appx.reject")}
              </button>
            </>
          )}
          <button
            type="button"
            onClick={() => advance("new")}
            className="rounded-[var(--radius-sm)] border border-[var(--border)] px-3 py-1.5 text-xs font-semibold text-[var(--text-2)] hover:border-[var(--primary)]"
          >
            {t("appx.reset")}
          </button>
        </div>
      </div>
    </div>
  );
}

function Card({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="mb-3.5 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4">
      {title && (
        <div className="mb-1 text-[13px] font-bold tracking-wide text-[var(--text)]">
          {title}
        </div>
      )}
      {children}
    </div>
  );
}

function CollapsedStage({
  stage,
  kind,
}: {
  stage: DocStage;
  kind: "past" | "future";
}) {
  const t = useTranslations("cabinet");
  return (
    <details className="mb-2.5 overflow-hidden rounded-[var(--radius)] border border-[var(--border-soft)] bg-[var(--surface-warm)]">
      <summary className="flex cursor-pointer list-none items-center gap-2.5 px-3.5 py-3 text-[13px] font-semibold text-[var(--text-2)] [&::-webkit-details-marker]:hidden">
        <span
          className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full text-[9px] leading-none text-white"
          style={{
            background: kind === "past" ? "var(--primary)" : "var(--border-strong)",
          }}
        >
          {kind === "past" ? "✓" : ""}
        </span>
        <span>{stage.label}</span>
        <span className="ml-auto text-[11px] text-[var(--text-3)]">
          {stage.documents.length} {t("appx.docsCount")}
        </span>
      </summary>
      <div className="px-3.5 pb-3 pt-1">
        {stage.documents.map((d) => (
          <DocRow
            key={d.requirement_key}
            doc={d}
            interactive={false}
            onUpload={() => {}}
            onSign={() => {}}
          />
        ))}
      </div>
    </details>
  );
}
