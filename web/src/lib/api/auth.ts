// =====================================================
// ===== D1: auth-эндпоинты (/api/v1/auth/Account/*) ===
// Типы запросов/ответов — из backend/internal/auth/handler.go.
// =====================================================

import {
  AUTH_PREFIX,
  EGOV_AUTHORIZE_URL,
  EGOV_CLIENT_ID,
  EGOV_REDIRECT_URI,
  EGOV_SCOPE,
  EGOV_STATE_KEY,
  egovSsoEnabled,
} from "./config";
import { http, type ApiResult } from "./http";

/** purpose для VerifySmsCode (контракт backend). */
export type SmsPurpose = "login" | "registration";

// --- Ответы (форма из handler.go) ----------------------------------------

/** Ответ sendCode: { sent, demoCode?, debugCode? } (demoCode только в DEMO_MODE). */
export interface SendSmsResponse {
  sent?: boolean;
  /** Маскированный телефон, на который ушёл код («подтянули из базы»): +7 700 ***67. */
  phone?: string;
  /** Демо-код, если бэкенд в DEMO_MODE (фронт подставит его в ячейки OTP). */
  demoCode?: string;
  debugCode?: string;
  message?: string;
}

/** Ответ VerifySmsCode. Для purpose=login дополнительно содержит токены. */
export interface VerifyResponse {
  verified?: boolean;
  attemptsLeft?: number;
  message?: string;
  accessToken?: string;
  refreshToken?: string;
}

/** Ответ smsRegister. */
export interface RegisterResponse {
  uid?: string;
  accessToken?: string;
  refreshToken?: string;
  message?: string;
}

/** Ответ ssoDemoLogin (содержит готовый профиль + токены). */
export interface SsoResponse {
  uid?: string;
  accessToken?: string;
  refreshToken?: string;
  name?: string;
  iin?: string;
  phone?: string;
  via?: string;
  message?: string;
}

/** Ответ GET /me. */
export interface MeResponse {
  uid?: string;
  iin?: string;
  name?: string;
  phone?: string;
  message?: string;
}

// --- Вызовы --------------------------------------------------------------

/**
 * Шаг 1 входа: отправить код по SMS на телефон зарегистрированного клиента по ИИН.
 * 404 → пользователь не найден (нужна регистрация).
 */
export function requestSms(iin: string): Promise<ApiResult<SendSmsResponse>> {
  return http<SendSmsResponse>(AUTH_PREFIX + "/RequestSms", {
    method: "POST",
    body: { iin },
  });
}

/** Шаг 1 регистрации: БМГ-проверка + отправка кода (phone в формате +7XXXXXXXXXX). */
export function checkBmgAndSendSmsForRegister(
  iin: string,
  phone: string,
): Promise<ApiResult<SendSmsResponse>> {
  return http<SendSmsResponse>(AUTH_PREFIX + "/CheckBmgAndSendSmsForRegister", {
    method: "POST",
    body: { iin, phone },
  });
}

/**
 * Проверка кода. Для purpose=login при verified=true бэкенд кладёт accessToken/refreshToken.
 * Бэкенд отдаёт 200 даже при verified=false — читай поле verified, а не статус.
 */
export function verifySmsCode(
  iin: string,
  code: string,
  purpose: SmsPurpose,
): Promise<ApiResult<VerifyResponse>> {
  return http<VerifyResponse>(AUTH_PREFIX + "/VerifySmsCode", {
    method: "POST",
    body: { iin, code, purpose },
  });
}

/** Завершение регистрации (после подтверждённого кода) → токены. */
export function smsRegister(req: {
  iin: string;
  lastName: string;
  firstName: string;
  middleName: string;
  phoneNumber: string;
}): Promise<ApiResult<RegisterResponse>> {
  return http<RegisterResponse>(AUTH_PREFIX + "/smsRegister", {
    method: "POST",
    body: req,
  });
}

/** Демо-вход через eGov/Bayterek (только DEMO_MODE) → профиль + токены. */
export function ssoDemoLogin(
  provider: "egov" | "baiterek",
): Promise<ApiResult<SsoResponse>> {
  return http<SsoResponse>(AUTH_PREFIX + "/ssoDemoLogin", {
    method: "POST",
    body: { provider },
  });
}

/**
 * Реальный вход через eGov: обмен authorization code (после редиректа с idp.egov.kz)
 * на профиль + токены. redirectUri передаём тот же, что слали в /authorize — eGov сверяет точно.
 */
export function ssoEgovLogin(
  code: string,
  redirectUri: string,
): Promise<ApiResult<SsoResponse>> {
  return http<SsoResponse>(AUTH_PREFIX + "/ssoEgovLogin", {
    method: "POST",
    body: { code, redirectUri },
  });
}

/**
 * Запускает реальный eGov-поток: генерирует anti-CSRF state, кладёт его в sessionStorage
 * и уводит браузер на страницу авторизации eGov. На странице eGov пользователь выбирает
 * метод входа (логин/пароль, ЭЦП, МЭЦП). Возврат — на EGOV_REDIRECT_URI с ?code=&state=.
 * Возвращает false, если eGov не сконфигурирован (тогда вызывающий код идёт в демо).
 */
export function startEgovLogin(lang: "ru" | "kk" | "en" = "ru"): boolean {
  if (!egovSsoEnabled || typeof window === "undefined") return false;

  const state =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2) + Date.now().toString(36);
  try {
    sessionStorage.setItem(EGOV_STATE_KEY, state);
  } catch {
    /* приватный режим — продолжаем без сверки state */
  }

  const params = new URLSearchParams({
    response_type: "code",
    client_id: EGOV_CLIENT_ID,
    redirect_uri: EGOV_REDIRECT_URI,
    scope: EGOV_SCOPE,
    state,
    lang: lang === "kk" ? "kk" : lang === "en" ? "en" : "ru",
  });
  window.location.href = `${EGOV_AUTHORIZE_URL}?${params.toString()}`;
  return true;
}

/** Профиль текущего пользователя (Bearer). */
export function me(): Promise<ApiResult<MeResponse>> {
  return http<MeResponse>(AUTH_PREFIX + "/me", { method: "GET", auth: true });
}
