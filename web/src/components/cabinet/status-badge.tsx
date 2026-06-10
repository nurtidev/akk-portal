"use client";

// =====================================================
// ===== D3: статус-пилюля заявки ======================
// Цвет по тону (этап/одобрено/отказ) — как pill() в легаси.
// =====================================================

import type { Application } from "@/lib/api";
import { pillColor, statusPill } from "./helpers";

export function StatusBadge({ app }: { app: Application }) {
  const { label, tone } = statusPill(app);
  const color = pillColor(tone);
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold whitespace-nowrap"
      style={{
        background: color + "14",
        color,
        border: "1px solid " + color + "33",
      }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ background: color }}
      />
      {label}
    </span>
  );
}
