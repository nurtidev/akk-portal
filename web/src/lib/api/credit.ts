// =====================================================
// ===== D1: credit-эндпоинты (/api/v1/credit/*) =======
// Единый источник — НАШ Go-backend (backend/internal/credit). creditapp
// отключён: заявки, этапы, документы и данные клиента (onboarding) живут у нас.
// Все вызовы идут через http() с akk-токеном (auth:true) на API_BASE.
// Бэкенд уже отдаёт DTO в форме, которую ждёт UI (toDTO/buildDocumentsDTO),
// поэтому маппинг ответа не нужен.
// =====================================================

import { API_BASE, CREDIT_PREFIX, apiAvailable } from "./config";
import { http, type ApiResult } from "./http";
import { accessToken } from "./tokens";

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
  /** Поимённый источник для gov (КГД/ПКБ/ГБД ФЛ/…); пусто для upload/sign. */
  provenance?: string;
  /** required | verified | uploaded */
  status: string;
  file_name: string | null;
  /** true → требование закрыто валидным документом из «Моих документов». */
  from_vault?: boolean;
  /** true → документ в хранилище просрочен, нужно обновить. */
  needs_refresh?: boolean;
  /** Срок действия из хранилища (YYYY-MM-DD), если есть. */
  valid_until?: string;
}

/** Тип документа в личном хранилище «Мои документы». */
export interface MyDocument {
  key: string;
  title: string;
  source: "gov" | "upload" | "sign";
  /** Поимённый источник для gov (КГД/ПКБ/ГБД ФЛ/…); пусто для upload/sign. */
  provenance?: string;
  /** Срок годности в днях (0 = бессрочно). */
  validity_days: number;
  reusable: boolean;
  /** missing | valid | expiring | expired */
  status: "missing" | "valid" | "expiring" | "expired";
  file_name?: string;
  /** YYYY-MM-DD */
  issued_at?: string;
  /** YYYY-MM-DD (нет для бессрочных) */
  valid_until?: string;
  /** true → в БД лежит реальный файл (можно показать превью/скачать). */
  has_file?: boolean;
  /** MIME загруженного файла (application/pdf, image/*). */
  content_type?: string;
  /** Размер файла в байтах. */
  file_size?: number;
  /** Метод подписи для sign-документов: ecp | sms (если подписан). */
  sign_method?: string;
}

/** Уведомление кабинета (генерируется из статусов заявок на бэкенде). */
export interface NotificationItem {
  kind: "ok" | "info" | "danger";
  code: string;
  title: string;
  text: string;
  /** Непрочитано (событие новее отметки просмотра). */
  unread: boolean;
  /** ISO-время события. */
  created_at: string;
  application_number?: string;
  stage_index?: number;
}

/** Ответ GET /notifications. */
export interface NotificationsDTO {
  items: NotificationItem[];
  /** Количество непрочитанных. */
  unread: number;
}

/** Лента уведомлений + счётчик непрочитанных. */
export function listNotifications(): Promise<ApiResult<NotificationsDTO>> {
  return http<NotificationsDTO>(CREDIT_PREFIX + "/notifications", {
    method: "GET",
    auth: true,
  });
}

/** Отметить уведомления просмотренными (счётчик непрочитанных → 0). */
export function markNotificationsRead(): Promise<ApiResult<{ ok: boolean }>> {
  return http<{ ok: boolean }>(CREDIT_PREFIX + "/notifications/read", {
    method: "POST",
    auth: true,
  });
}

/** Денежная сумма, распознанная ИИ (метка + значение строкой). */
export interface ExtractedAmount {
  label: string;
  value: string;
}

/** Ключевые поля документа, распознанные ИИ (ассистивно — требуют подтверждения). */
export interface ExtractedFields {
  document_type: string;
  full_name: string;
  iin: string;
  issue_date: string;
  period: string;
  issuer: string;
  amounts: ExtractedAmount[];
  /** Уверенность распознавания 0..1. */
  confidence: number;
}

/** Расхождение распознанного поля с профилем клиента. */
export interface ExtractMismatch {
  field: string;
  extracted: string;
  profile: string;
}

/** Ответ POST /my-documents/:key/extract. */
export interface ExtractResult {
  fields: ExtractedFields;
  mismatches: ExtractMismatch[];
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

/** Личное хранилище «Мои документы»: типы + статус по сроку действия. */
export function listMyDocuments(): Promise<ApiResult<MyDocument[]>> {
  return http<MyDocument[]>(CREDIT_PREFIX + "/my-documents", {
    method: "GET",
    auth: true,
  });
}

/** Сохранить/обновить документ в хранилище (метаданные; valid_until считает бэкенд). */
export function upsertMyDocument(
  docType: string,
  fileName: string,
  issuedAt?: string,
): Promise<ApiResult<MyDocument>> {
  return http<MyDocument>(CREDIT_PREFIX + "/my-documents", {
    method: "POST",
    auth: true,
    body: { doc_type: docType, file_name: fileName, issued_at: issuedAt },
  });
}

/** Загрузить реальный файл документа в хранилище (multipart). valid_until считает бэкенд. */
export function uploadMyDocumentFile(
  docType: string,
  file: File,
  issuedAt?: string,
): Promise<ApiResult<MyDocument>> {
  const fd = new FormData();
  fd.append("file", file);
  if (issuedAt) fd.append("issued_at", issuedAt);
  return http<MyDocument>(
    CREDIT_PREFIX + "/my-documents/" + encodeURIComponent(docType) + "/file",
    { method: "POST", auth: true, body: fd },
  );
}

/** Подписать sign-документ (согласие на ПД и т.п.) методом ЭЦП или SMS. */
export function signMyDocument(
  docType: string,
  method: "ecp" | "sms",
): Promise<ApiResult<MyDocument>> {
  return http<MyDocument>(
    CREDIT_PREFIX + "/my-documents/" + encodeURIComponent(docType) + "/sign",
    { method: "POST", auth: true, body: { method } },
  );
}

/**
 * Распознать ключевые поля загруженного документа через ИИ (ассистивно).
 * 503 (status) — фича не настроена на бэкенде (нет ANTHROPIC_API_KEY).
 */
export function extractMyDocumentFields(
  docType: string,
): Promise<ApiResult<ExtractResult>> {
  return http<ExtractResult>(
    CREDIT_PREFIX + "/my-documents/" + encodeURIComponent(docType) + "/extract",
    { method: "POST", auth: true },
  );
}

/**
 * Скачать файл документа хранилища как object URL (с Bearer) — для превью/скачивания.
 * Вызывающий обязан освободить URL через URL.revokeObjectURL после использования.
 * null — если бэкенд недоступен, файла нет или произошла ошибка.
 */
export async function fetchMyDocumentObjectUrl(
  docType: string,
): Promise<string | null> {
  if (!apiAvailable) return null;
  const tok = accessToken();
  try {
    const res = await fetch(
      API_BASE +
        CREDIT_PREFIX +
        "/my-documents/" +
        encodeURIComponent(docType) +
        "/file",
      { headers: tok ? { Authorization: "Bearer " + tok } : {} },
    );
    if (!res.ok) return null;
    return URL.createObjectURL(await res.blob());
  } catch {
    return null;
  }
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
