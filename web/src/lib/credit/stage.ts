// =====================================================
// ===== D4: упрощённый трекер заявки (5 этапов) ========
// Маппинг гранулярных workflow_status credit-backend на 5 понятных заёмщику
// этапов + детект терминальных статусов (отклонена / отменена / закрыта).
// Источник правды — workflow_status из GET /applications/:uid/status.
// =====================================================

/** Терминальное состояние заявки (показывается баннером, а не степпером). */
export type TerminalKind = "rejected" | "cancelled" | "closed";

/** Результат проекции workflow_status на этап заёмщика. */
export interface StageInfo {
  /** Номер этапа 1..5. Для терминальных — последний достигнутый (приглушённый степпер). */
  index: 1 | 2 | 3 | 4 | 5;
  /** Человекочитаемая подпись этапа (RU). */
  label: string;
  /** Терминальное состояние, если статус терминальный. */
  terminal?: TerminalKind;
}

// ─── 5 этапов заёмщика ───────────────────────────────────────────────────────

/** Подписи 5 этапов (RU). TODO перевод kk/en — добавить в i18n-словарь. */
export const STAGE_LABELS: Record<1 | 2 | 3 | 4 | 5, string> = {
  1: "Заявка подана",
  2: "Рассмотрение",
  3: "Решение (кредитный комитет)",
  4: "Оформление",
  5: "Выдача",
};

/** workflow_status → номер этапа (1..5). «ЗАВЕРШЕНО» относится к этапу 5. */
const STAGE_BY_STATUS: Record<string, 1 | 2 | 3 | 4 | 5> = {
  // STAGE 1 — Заявка подана
  new: 1,
  registration: 1,
  package_forming: 1,
  package_formed: 1,
  client_signing: 1,
  flk_validation: 1,
  document_signing: 1,
  consent_pending: 1,
  // STAGE 2 — Рассмотрение
  scoring_in_progress: 2,
  scoring_positive: 2,
  scoring_reviewed: 2,
  distribution_pending: 2,
  manager_assigned: 2,
  escalated_to_head: 2,
  manager_expertise: 2,
  inspections: 2,
  expertise: 2,
  aggregated: 2,
  rework: 2,
  // STAGE 3 — Решение (кредитный комитет)
  cc_pending: 3,
  cc_voting: 3,
  cc_approved: 3,
  financing_conditions: 3,
  additional_sp: 3,
  ekd_acceptance: 3,
  additional_collateral: 3,
  approval_letter_signing: 3,
  // STAGE 4 — Оформление
  contract_generation: 4,
  contract_signing: 4,
  contracts_signed: 4,
  obligations_before_disbursement: 4,
  pledge_registration: 4,
  rejection_letter_signing: 4,
  // STAGE 5 — Выдача
  disbursement_pending: 5,
  disbursement_verification: 5,
  disbursement_signing: 5,
  disbursed: 5,
  disbursement_completed: 5,
  issued: 5,
  // ЗАВЕРШЕНО (этап 5 done)
  completed: 5,
  completed_with_post_obligations: 5,
  completed_monitoring_done: 5,
  monitoring: 5,
  monitoring_completed: 5,
};

// ─── Терминальные статусы ──────────────────────────────────────────────────────

/** ОТКЛОНЕНА (красный баннер). */
const REJECTED_STATUSES: ReadonlySet<string> = new Set([
  "rejected",
  "rejected_cc",
  "rejected_cc_escalation",
  "rejected_expertise_negative",
  "rejected_inspection_failed",
  "rejected_manager_review",
  "rejected_registration_failed",
  "rejected_scoring",
  "scoring_negative",
]);

/** ОТМЕНЕНА (серый баннер). */
const CANCELLED_STATUSES: ReadonlySet<string> = new Set([
  "cancelled",
  "cancelled_admin",
  "cancelled_client_expertise",
  "cancelled_client_flk",
  "cancelled_client_scoring",
  "cancelled_client_signing",
  "cancelled_system",
  "declined_by_borrower",
  "expired_cc_decision",
  "expired_distribution",
  "expired_document_signing",
  "expired_expertise",
  "expired_flk_correction",
  "expired_inspections",
  "expired_manager_expertise",
  "expired_post_obligations",
  "expired_registration",
  "expired_signing",
]);

/** ПРОЧЕЕ → закрыта/приостановлена (нейтральный баннер). */
const CLOSED_STATUSES: ReadonlySet<string> = new Set([
  "archived",
  "merged",
  "duplicate_closed",
  "suspended",
  "transferred",
]);

// ─── Публичный хелпер ──────────────────────────────────────────────────────────

/**
 * Проекция workflow_status на этап заёмщика.
 * Неизвестный статус → этап 1 (безопасный дефолт) + console.warn.
 */
export function stageOf(workflowStatus: string | undefined): StageInfo {
  const status = (workflowStatus || "").trim();

  // 1. Терминальные — показываем последний достигнутый этап + флаг terminal.
  if (REJECTED_STATUSES.has(status)) {
    return { index: terminalReachedIndex(status), label: "Отклонена", terminal: "rejected" };
  }
  if (CANCELLED_STATUSES.has(status)) {
    return { index: terminalReachedIndex(status), label: "Отменена", terminal: "cancelled" };
  }
  if (CLOSED_STATUSES.has(status)) {
    return { index: terminalReachedIndex(status), label: "Закрыта", terminal: "closed" };
  }

  // 2. Активные этапы.
  const idx = STAGE_BY_STATUS[status];
  if (idx != null) {
    return { index: idx, label: STAGE_LABELS[idx] };
  }

  // 3. Неизвестный статус — безопасный дефолт.
  if (status) {
    console.warn(`[stageOf] неизвестный workflow_status: "${status}" → этап 1 (дефолт)`);
  }
  return { index: 1, label: STAGE_LABELS[1] };
}

/** Этап, на котором заявка ушла в терминальное состояние (для приглушённого степпера).
 * Эвристика по семантике статуса: если в названии есть стадия — берём её, иначе 1. */
function terminalReachedIndex(status: string): 1 | 2 | 3 | 4 | 5 {
  if (
    status.includes("scoring") ||
    status.includes("expertise") ||
    status.includes("inspection") ||
    status.includes("manager") ||
    status.includes("distribution") ||
    status.includes("flk")
  ) {
    return 2;
  }
  if (status.includes("cc")) return 3;
  if (
    status.includes("signing") ||
    status.includes("post_obligations") ||
    status.includes("document")
  ) {
    return 4;
  }
  return 1;
}
