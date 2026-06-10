// =====================================================
// ===== D1/D4: проекция статусов заявки на этапы =======
// APP_STAGES (9 этапов) + STATUS_INDEX — перенос 1-в-1 из __auth-integration.js.
// Маппинг покрывает и демо-лестницу (store.StatusLadder), и реальные
// workflow-статусы Temporal, если бэкенд начнёт их слать.
// =====================================================

/** Клиентские этапы движения заявки (9 этапов + терминальная ветка отказа). */
export const APP_STAGES = [
  "Регистрация заявки",
  "Новая заявка",
  "На рассмотрении",
  "Одобрена",
  "Оценка залога",
  "Договор",
  "Средства выданы",
  "Мониторинг",
  "Завершена",
] as const;

/** Полный маппинг workflow-статус → индекс клиентского этапа. */
export const STATUS_INDEX: Record<string, number> = {
  new: 0,
  flk_validation: 0,
  document_signing: 0,
  scoring_in_progress: 1,
  scoring_positive: 1,
  scoring_reviewed: 1,
  distribution_pending: 1,
  manager_assigned: 1,
  manager_expertise: 2,
  inspections: 2,
  expertise: 2,
  aggregated: 2,
  cc_pending: 2,
  cc_voting: 2,
  cc_approved: 3,
  financing_conditions: 3,
  approval_letter_signing: 3,
  // Этап 4 — Оценка залога
  collateral_valuation: 4,
  collateral_pledge: 4,
  valuation: 4,
  insurance: 4,
  // Этап 5 — Договор
  contract_generation: 5,
  contract_signing: 5,
  contracts_signed: 5,
  disbursement_pending: 5,
  disbursed: 6,
  monitoring: 7,
  completed: 8,
};

/** Терминальные статусы отказа/отмены → подпись красной ленты. */
export const REJECTED_STATUS: Record<string, string> = {
  rejected: "Отказано",
  rejected_scoring: "Отказано (скоринг)",
  rejected_cc: "Отказано (КК)",
  scoring_negative: "Отказано (скоринг)",
  cc_rejected: "Отказано (КК)",
  cancelled: "Отменена",
};

/** Подпись отказа для статуса (пустая строка, если статус — не отказ). */
export function rejectLabel(status: string): string {
  return REJECTED_STATUS[status] || "";
}

/** Индекс этапа по статусу заявки (неизвестный → 0). */
export function appStageIndex(status: string | undefined): number {
  const s = status || "new";
  return STATUS_INDEX[s] != null ? STATUS_INDEX[s] : 0;
}
