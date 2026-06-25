// =====================================================
// ===== D1: credit-эндпоинты (/api/v1/credit/*) =======
// Единый источник — НАШ Go-backend (backend/internal/credit). creditapp
// отключён: заявки, этапы, документы и данные клиента (onboarding) живут у нас.
// Все вызовы идут через http() с akk-токеном (auth:true) на API_BASE.
// Бэкенд уже отдаёт DTO в форме, которую ждёт UI (toDTO/buildDocumentsDTO),
// поэтому маппинг ответа не нужен.
// =====================================================

import { CREDIT_PREFIX } from "./config";
import { http, type ApiResult } from "./http";

/** Заявка (DTO бэкенда — toDTO). */
export interface Application {
  uid: string;
  number: string;
  program_id: string;
  /** Алиас program_id (сохранён для совместимости с submit-application.ts). */
  program?: string;
  purpose: string;
  amount: number;
  status: string;
  onboarding?: unknown;
  created_at?: string;
}

/** Документ требования в составе этапа (buildDocumentsDTO). */
export interface AppDocument {
  requirement_key: string;
  title: string;
  /** gov | upload | sign */
  source: "gov" | "upload" | "sign";
  /** required | verified | uploaded */
  status: string;
  file_name: string | null;
}

/** Этап лестницы с документами. */
export interface DocStage {
  status_key: string;
  stage_index: number;
  label: string;
  documents: AppDocument[];
}

/** Ответ GET /applications/:uid/documents. */
export interface DocumentsDTO {
  application_uid: string;
  current_status: string;
  current_stage_index: number;
  stages: DocStage[];
}

/** Ответ GET /applications/:uid/status. */
export interface ApplicationStatus {
  uid: string;
  workflow_status: string;
  is_terminal: boolean;
  can_cancel: boolean;
  available_actions: string[];
}

/** Параметры для createApplication (контракт createReq бэкенда). */
export interface CreateApplicationPayload {
  /** Сумма в тенге. */
  requested_amount: number;
  /** Цель кредитования. */
  loan_purpose: string;
  /** id программы (сохраняется в заявке и onboarding). */
  program_id?: string;
  /** Произвольный снимок воронки (JSONB onboarding) — данные клиента. */
  onboarding?: unknown;
}

/** Создать заявку. Личность берётся из akk-токена (Bearer); возвращает Application. */
export function createApplication(
  payload: CreateApplicationPayload,
): Promise<ApiResult<Application>> {
  return http<Application>(CREDIT_PREFIX + "/applications", {
    method: "POST",
    auth: true,
    body: {
      requested_amount: Math.round(payload.requested_amount || 0),
      loan_purpose: payload.loan_purpose || "",
      program_id: payload.program_id || "",
      onboarding: payload.onboarding ?? {},
    },
  });
}

/** Список заявок текущего клиента (новые сверху) — плоский массив toDTO. */
export function listApplications(): Promise<ApiResult<Application[]>> {
  return http<Application[]>(CREDIT_PREFIX + "/applications", {
    method: "GET",
    auth: true,
  });
}

/** Статус заявки + флаги для трекера и кнопки отмены (can_cancel/is_terminal). */
export function getApplicationStatus(
  uid: string,
): Promise<ApiResult<ApplicationStatus>> {
  return http<ApplicationStatus>(
    CREDIT_PREFIX + "/applications/" + uid + "/status",
    { method: "GET", auth: true },
  );
}

/** Самостоятельная отмена заявки заёмщиком (до решения КК).
 * 200 — отменена; 409 — на текущем этапе отмена недоступна. */
export function cancelApplication(
  uid: string,
  reason?: string,
): Promise<ApiResult<Application>> {
  return http<Application>(CREDIT_PREFIX + "/applications/" + uid + "/cancel", {
    method: "POST",
    auth: true,
    body: { reason: reason || "Отменено заявителем" },
  });
}

/** Демо-управление этапом: без тела — следующий этап; со {status} — конкретный. */
export function advanceApplication(
  uid: string,
  status?: string,
): Promise<ApiResult<Application>> {
  return http<Application>(CREDIT_PREFIX + "/applications/" + uid + "/advance", {
    method: "POST",
    auth: true,
    body: status ? { status } : undefined,
  });
}

/** Чек-лист документов заявки, сгруппированный по этапам. */
export function listDocuments(uid: string): Promise<ApiResult<DocumentsDTO>> {
  return http<DocumentsDTO>(
    CREDIT_PREFIX + "/applications/" + uid + "/documents",
    { method: "GET", auth: true },
  );
}

/** Отметить требование как загруженное/подписанное (метаданные, без файла). */
export function uploadDocument(
  uid: string,
  requirementKey: string,
  fileName: string,
): Promise<
  ApiResult<{ requirement_key: string; status: string; file_name: string | null }>
> {
  return http(CREDIT_PREFIX + "/applications/" + uid + "/documents", {
    method: "POST",
    auth: true,
    body: { requirement_key: requirementKey, file_name: fileName },
  });
}
