"use client";

// =====================================================
// ===== D4: упрощённый степпер заявки (5 этапов) =======
// Текущий этап подсвечен, пройденные — галочка, будущие — серые.
// Терминальные заявки рисуют степпер приглушённым (dim) под баннером.
// =====================================================

import { STAGE_LABELS } from "@/lib/credit/stage";

const STAGE_INDEXES: Array<1 | 2 | 3 | 4 | 5> = [1, 2, 3, 4, 5];

export function SimpleStepper({
  currentIndex,
  done = false,
  dim = false,
}: {
  /** Текущий этап 1..5. */
  currentIndex: 1 | 2 | 3 | 4 | 5;
  /** true → заявка завершена (этап 5 пройден, все этапы с галочкой). */
  done?: boolean;
  /** true → приглушить (для терминальных отклонена/отменена/закрыта). */
  dim?: boolean;
}) {
  return (
    <div
      className="mt-2.5 flex flex-col gap-2.5 md:gap-2"
      style={{ opacity: dim ? 0.45 : 1 }}
    >
      {STAGE_INDEXES.map((i) => {
        const passed = done || i < currentIndex;
        const cur = !done && i === currentIndex;
        const dotBg = passed || cur ? "var(--primary)" : "var(--border)";
        const dotColor = passed || cur ? "#fff" : "var(--text-3)";
        const textColor = cur
          ? "var(--primary)"
          : passed
            ? "var(--text)"
            : "var(--text-3)";
        const icon = passed ? "✓" : cur ? "●" : "";
        return (
          <div
            key={i}
            className="flex items-center gap-2.5 py-0.5 text-sm md:gap-2 md:text-[13px]"
            style={{ color: textColor, fontWeight: cur ? 700 : 500 }}
          >
            <span
              className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-[11px] leading-none md:h-5 md:w-5 md:text-[10px]"
              style={{ background: dotBg, color: dotColor }}
            >
              {icon}
            </span>
            <span>{STAGE_LABELS[i]}</span>
          </div>
        );
      })}
    </div>
  );
}
