// =====================================================
// ===== D1: credit-эндпоинты (/api/v1/credit/*) =======
// Контракт — credit-backend Go (проверен живьём 2026-06-24).
// Создание: POST /api/v1/credit/applications (201)
// Список:   GET  /api/v1/credit/applications → {items:[...], total, page, page_size}
// Статус:   GET  /api/v1/credit/applications/{uid}/status
// =====================================================

import {
  CREDIT_API_BASE,
  CREDIT_PREFIX,
  creditApiAvailable,
  DEMO_BRANCH_UID,
  DEMO_PRODUCT_CODE,
  SUBMIT_TYPE,
} from "./config";
import { type ApiResult } from "./http";
import { getCreditToken, refreshCreditToken } from "./credit-session";

/** Заявка (DTO — нормализованный вид для UI). */
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

/** Ответ GET /applications/:uid/status (контракт creditapp credit-backend). */
export interface ApplicationStatus {
  uid: string;
  workflow_status: string;
  is_terminal: boolean;
  can_cancel: boolean;
  available_actions: string[];
}

// ─── Внутренние DTO ответов credit-backend ───────────────────────────────────

/** requested_amount в ответе POST /applications (объект). */
interface BackendAmountObj {
  amount: string;
  currency: string;
}

/** Элемент items[] из GET /applications. */
interface BackendListItem {
  uid: string;
  number: string;
  workflow_status: string;
  requested_amount: string; // "50000000.00" — плоская строка в списке
  created_at: string;
  loan_process_type?: string;
  is_read?: boolean;
}

/** Ответ POST /applications (201). */
interface BackendCreateResponse {
  uid: string;
  number: string;
  workflow_status: string;
  status?: string;
  loan_process_type?: string;
  submission_flow?: string;
  requested_amount: BackendAmountObj;
  loan_purpose?: string;
  created_at: string;
}

/** Ответ GET /applications (обёртка с пагинацией). */
interface BackendListResponse {
  items: BackendListItem[];
  total: number;
  page: number;
  page_size: number;
}

// ─── Маппинг ─────────────────────────────────────────────────────────────────

function mapCreateResponse(r: BackendCreateResponse): Application {
  return {
    uid: r.uid,
    number: r.number,
    program_id: "",
    status: r.workflow_status || r.status || "new",
    purpose: r.loan_purpose || "",
    amount: parseFloat(r.requested_amount?.amount ?? "0") || 0,
    created_at: r.created_at,
  };
}

function mapListItem(item: BackendListItem): Application {
  return {
    uid: item.uid,
    number: item.number,
    program_id: "",
    status: item.workflow_status || "new",
    purpose: "",
    amount: parseFloat(item.requested_amount) || 0,
    created_at: item.created_at,
  };
}

// ─── Тело создания заявки (контракт credit-backend) ──────────────────────────

/** Параметры для createApplication, передаваемые из submit-application.ts. */
export interface CreateApplicationPayload {
  /** Сумма в тенге. */
  requested_amount: number;
  /** Цель кредитования (минимум 3 символа). */
  loan_purpose: string;
  /** id программы (опциональный — сохраняется в onboarding). */
  program_id?: string;
  /** Произвольный снимок воронки. */
  onboarding?: unknown;
}

// ─── Запрос к creditapp credit-backend через мост-токен ──────────────────────
// НЕ используем общий http(auth:true): там akk-backend токен/база. creditapp —
// отдельный хост (CREDIT_API_BASE) со своим JWT и базой, мост-токен из
// getCreditToken(). При 401 — один перебутстрап токена и повтор.

/** Низкоуровневый запрос к creditapp с мост-токеном. Никогда не бросает. */
async function creditRequest<T>(
  method: "GET" | "POST",
  path: string,
  body?: unknown,
): Promise<ApiResult<T>> {
  if (!creditApiAvailable) {
    return { ok: false, status: -1, data: null, unavailable: true };
  }

  let token = await getCreditToken();
  if (!token) {
    // ИИН недоступен или creditapp не сконфигурирован → demo-fallback.
    return { ok: false, status: -1, data: null, unavailable: true };
  }

  const send = async (bearer: string): Promise<ApiResult<T>> => {
    try {
      const init: RequestInit = {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + bearer,
        },
      };
      if (body !== undefined) init.body = JSON.stringify(body);

      const res = await fetch(CREDIT_API_BASE + path, init);
      const txt = await res.text();
      let data: unknown = null;
      try {
        data = txt ? JSON.parse(txt) : null;
      } catch {
        data = txt;
      }
      return { ok: res.ok, status: res.status, data: data as T };
    } catch {
      return { ok: false, status: 0, data: null };
    }
  };

  let result = await send(token);

  // 401 → мост-токен протух/невалиден: перебутстрап и одна повторная попытка.
  if (result.status === 401) {
    const fresh = await refreshCreditToken();
    if (!fresh) {
      return { ok: false, status: -1, data: null, unavailable: true };
    }
    token = fresh;
    result = await send(token);
  }

  return result;
}

/** Создать заявку в creditapp (мост-токен). Маппит ответ в Application для UI.
 * borrower_iin/name НЕ передаём — creditapp берёт личность из мост-токена.
 */
export async function createApplication(
  payload: CreateApplicationPayload,
): Promise<ApiResult<Application>> {
  // loan_purpose обязан быть минимум 3 символа
  const loanPurpose =
    (payload.loan_purpose || "").length >= 3
      ? payload.loan_purpose
      : payload.loan_purpose + "   ".slice(payload.loan_purpose.length);

  const body = {
    requested_amount: String(Math.round(payload.requested_amount || 0)),
    loan_purpose: loanPurpose.trim() || "Не указана",
    branch_uid: DEMO_BRANCH_UID,
    product_code: DEMO_PRODUCT_CODE,
    submit_type: SUBMIT_TYPE,
  };

  const raw = await creditRequest<BackendCreateResponse>(
    "POST",
    CREDIT_PREFIX + "/applications",
    body,
  );

  if (!raw.ok || !raw.data) {
    return { ok: raw.ok, status: raw.status, data: null, unavailable: raw.unavailable };
  }

  return {
    ok: true,
    status: raw.status,
    data: mapCreateResponse(raw.data),
  };
}

/** Список заявок клиента из creditapp (мост-токен).
 * creditapp возвращает {items:[...], total, page, page_size}, НЕ плоский массив.
 * Сигнатура сохраняет ApiResult<Application[]> для совместимости с кабинетом.
 */
export async function listApplications(): Promise<ApiResult<Application[]>> {
  const raw = await creditRequest<BackendListResponse>("GET", CREDIT_PREFIX + "/applications");

  if (raw.unavailable) {
    return { ok: false, status: raw.status, data: null, unavailable: true };
  }
  if (!raw.ok || !raw.data) {
    return { ok: raw.ok, status: raw.status, data: null };
  }

  const items = Array.isArray(raw.data.items) ? raw.data.items : [];
  return {
    ok: true,
    status: raw.status,
    data: items.map(mapListItem),
  };
}

/** Статус заявки из creditapp (мост-токен).
 * GET /applications/:uid/status → { uid, workflow_status, is_terminal, can_cancel, available_actions }.
 * Источник правды для кнопки «Отменить заявку» (can_cancel) и упрощённого трекера.
 */
export async function getApplicationStatus(
  uid: string,
): Promise<ApiResult<ApplicationStatus>> {
  return creditRequest<ApplicationStatus>(
    "GET",
    CREDIT_PREFIX + "/applications/" + uid + "/status",
  );
}

/** Отмена заявки заёмщиком (мост-токен).
 * POST /applications/:uid/cancel, body { reason }.
 * 200 — сигнал отмены принят (отмена асинхронная: workflow обработает, статус
 *   через 1-2 сек сменится на cancelled_*).
 * 409 — нельзя отменить на текущей стадии (бэкенд гейтит ранними статусами).
 */
export async function cancelApplication(
  uid: string,
  reason?: string,
): Promise<ApiResult<unknown>> {
  return creditRequest<unknown>(
    "POST",
    CREDIT_PREFIX + "/applications/" + uid + "/cancel",
    { reason: reason || "Отменено заявителем" },
  );
}

// ─── Функции, недоступные в credit-backend (реальный workflow управляется ARM) ─

/**
 * Демо-управление этапом.
 * ВНИМАНИЕ: credit-backend НЕ имеет /advance — движение заявки выполняется
 * через ARM-интерфейс (akk-frontend). Функция сохранена, чтобы не сломать
 * импорты кабинета; при наличии бэкенда всегда возвращает unavailable.
 * В UI кнопки "advance/reject/reset" работают только в demo-режиме (без бэкенда).
 */
export function advanceApplication(
  uid: string,
  status?: string,
): Promise<ApiResult<Application>> {
  // Намеренно возвращаем unavailable — этого эндпоинта нет в credit-backend.
  // Кабинет деградирует мягко: показывает ошибку без краша.
  void uid;
  void status;
  return Promise.resolve<ApiResult<Application>>({
    ok: false,
    status: -1,
    data: null,
    unavailable: true,
  });
}

/**
 * Чек-лист документов.
 * credit-backend не имеет /documents endpoint — документы управляются через ARM.
 * Функция сохранена для совместимости; кабинет показывает пустой список документов.
 */
export function listDocuments(uid: string): Promise<ApiResult<DocumentsDTO>> {
  void uid;
  return Promise.resolve<ApiResult<DocumentsDTO>>({
    ok: false,
    status: -1,
    data: null,
    unavailable: true,
  });
}

/**
 * Загрузка документа (метаданные).
 * credit-backend не имеет этого эндпоинта — загрузка через ARM.
 * Сохранена для совместимости.
 */
export function uploadDocument(
  uid: string,
  requirementKey: string,
  fileName: string,
): Promise<ApiResult<{ requirement_key: string; status: string; file_name: string | null }>> {
  void uid;
  void requirementKey;
  void fileName;
  return Promise.resolve({ ok: false, status: -1, data: null, unavailable: true });
}
