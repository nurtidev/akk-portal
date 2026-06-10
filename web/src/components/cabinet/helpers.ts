// =====================================================
// ===== D3/D4: общие помощники кабинета ===============
// Название программы по id, форматирование суммы (через track A fmtAmount),
// цвет статус-пилюли. Перенос логики из __auth-integration.js.
// =====================================================

import { PROGRAMS } from "@/data/programs";
import { fmtAmount } from "@/lib/format";
import { APP_STAGES, appStageIndex, rejectLabel } from "@/lib/api";
import type { Application } from "@/lib/api";

/** Название программы по id (или «Индивидуальная консультация», если id пуст). */
export function programTitle(id: string | undefined): string {
  if (!id) return "Индивидуальная консультация";
  const p = PROGRAMS.find((x) => x.id === id);
  return p ? p.title : id;
}

/** Категория программы по id (для подзаголовков). */
export function programCategory(id: string | undefined): string {
  if (!id) return "";
  const p = PROGRAMS.find((x) => x.id === id);
  return p ? p.category : "";
}

/** Сумма в ₸ (полная, с разделителями) — для карточек/заголовков заявки. */
export function fmtMoney(n: number): string {
  return Math.round(n || 0).toLocaleString("ru-RU") + " ₸";
}

/** Укрупнённая сумма (млрд/млн/тыс) — для сводок. */
export function fmtMoneyShort(n: number): string {
  return fmtAmount(Math.round(n || 0));
}

export interface StatusPill {
  /** Текст пилюли (этап или подпись отказа). */
  label: string;
  /** Цветовая роль: 'reject' | 'approved' | 'progress'. */
  tone: "reject" | "approved" | "progress";
}

/** Данные статус-пилюли заявки (как statusPill в легаси). */
export function statusPill(app: Application): StatusPill {
  const rej = rejectLabel(app.status);
  if (rej) return { label: rej, tone: "reject" };
  const idx = appStageIndex(app.status);
  return {
    label: APP_STAGES[idx] || "",
    tone: idx >= 3 ? "approved" : "progress",
  };
}

/** CSS-цвет по тону пилюли (значения из легаси). */
export function pillColor(tone: StatusPill["tone"]): string {
  if (tone === "reject") return "#d6336c";
  if (tone === "approved") return "#2b8a3e";
  return "#1c6fd6";
}
