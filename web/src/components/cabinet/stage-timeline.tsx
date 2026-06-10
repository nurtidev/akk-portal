"use client";

// =====================================================
// ===== D4: трекер этапов заявки ======================
// Прогресс по 9 этапам (statusTimelineHtml) либо терминальная лента отказа
// (rejectedTimelineHtml). Перенос из __auth-integration.js.
// =====================================================

import { APP_STAGES } from "@/lib/api";

export function StageTimeline({
  currentIdx,
  progressLabel,
  currentLabel = "текущий этап",
}: {
  currentIdx: number;
  /** Строка «Этап N из M» (перевод передаёт родитель) — крупный якорь для мобилы. */
  progressLabel?: string;
  /** Подпись активного этапа (i18n передаёт родитель). */
  currentLabel?: string;
}) {
  return (
    <div className="mt-2.5 flex flex-col gap-2.5 md:gap-1.5">
      {progressLabel && (
        <div className="text-sm font-semibold text-[var(--primary)]">{progressLabel}</div>
      )}
      {APP_STAGES.map((s, i) => {
        const done = i < currentIdx;
        const cur = i === currentIdx;
        const dotBg = done || cur ? "var(--primary)" : "var(--border)";
        const dotColor = done || cur ? "#fff" : "var(--text-3)";
        const textColor = cur
          ? "var(--primary)"
          : done
            ? "var(--text)"
            : "var(--text-3)";
        const icon = done ? "✓" : cur ? "●" : "";
        return (
          <div
            key={i}
            className="flex items-center gap-2.5 py-0.5 text-[13.5px] md:gap-2 md:py-0 md:text-xs"
            style={{ color: textColor, fontWeight: cur ? 700 : 400 }}
          >
            <span
              className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[10px] leading-none md:h-4 md:w-4 md:text-[9px]"
              style={{ background: dotBg, color: dotColor }}
            >
              {icon}
            </span>
            <span>{s}</span>
            {cur && <span className="ml-auto text-[11px] md:text-[10px]">{currentLabel}</span>}
          </div>
        );
      })}
    </div>
  );
}

export function RejectedTimeline({
  reachedIdx,
  label,
}: {
  reachedIdx: number;
  label: string;
}) {
  return (
    <div className="mt-2.5 flex flex-col gap-1.5">
      {APP_STAGES.slice(0, reachedIdx + 1).map((s, i) => (
        <div key={i} className="flex items-center gap-2 text-xs text-[var(--text-3)]">
          <span className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-[var(--border-strong)] text-[9px] leading-none text-white">
            ✓
          </span>
          <span>{s}</span>
        </div>
      ))}
      <div className="flex items-center gap-2 text-xs font-bold text-[#d6336c]">
        <span className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-[#d6336c] text-[11px] leading-none text-white">
          ✕
        </span>
        <span>{label}</span>
        <span className="ml-auto text-[10px]">заявка закрыта</span>
      </div>
    </div>
  );
}
