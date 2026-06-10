// =====================================================
// ===== D1: credit-эндпоинты (/api/v1/credit/*) =======
// Типы — из backend/internal/credit/handler.go + requirements.go + store.go.
// =====================================================

import { CREDIT_PREFIX } from "./config";
import { http, type ApiResult } from "./http";

/** Заявка (DTO toDTO из handler.go). */
export interface Application {
  uid: string;
  number: string;
  program_id: string;
  /** Алиас program_id (бэкенд отдаёт оба поля). */
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

/** Тело создания заявки (контракт createReq). */
export interface CreateApplicationPayload {
  requested_amount: number;
  loan_purpose: string;
  program_id: string;
  /** Произвольный JSON онбординга (ответы квиза, программа, контакт). */
  onboarding?: unknown;
}

/** Создать заявку (Bearer). */
export function createApplication(
  payload: CreateApplicationPayload,
): Promise<ApiResult<Application>> {
  return http<Application>(CREDIT_PREFIX + "/applications", {
    method: "POST",
    auth: true,
    body: payload,
  });
}

/** Список заявок клиента (новые сверху). */
export function listApplications(): Promise<ApiResult<Application[]>> {
  return http<Application[]>(CREDIT_PREFIX + "/applications", {
    method: "GET",
    auth: true,
  });
}

/**
 * Демо-управление этапом. Без статуса — переход на следующий этап лестницы;
 * со статусом ('new' — сброс, 'rejected' — отказ) — установка конкретного.
 */
export function advanceApplication(
  uid: string,
  status?: string,
): Promise<ApiResult<Application>> {
  return http<Application>(CREDIT_PREFIX + `/applications/${uid}/advance`, {
    method: "POST",
    auth: true,
    body: status ? { status } : undefined,
  });
}

/** Чек-лист документов по заявке, сгруппированный по этапам. */
export function listDocuments(uid: string): Promise<ApiResult<DocumentsDTO>> {
  return http<DocumentsDTO>(CREDIT_PREFIX + `/applications/${uid}/documents`, {
    method: "GET",
    auth: true,
  });
}

/** Пометить требование загруженным/подписанным (метаданные, без байтов файла). */
export function uploadDocument(
  uid: string,
  requirementKey: string,
  fileName: string,
): Promise<ApiResult<{ requirement_key: string; status: string; file_name: string | null }>> {
  return http(CREDIT_PREFIX + `/applications/${uid}/documents`, {
    method: "POST",
    auth: true,
    body: { requirement_key: requirementKey, file_name: fileName },
  });
}
