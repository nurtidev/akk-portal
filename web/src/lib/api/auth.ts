// =====================================================
// ===== D1: auth-эндпоинты (/api/v1/auth/Account/*) ===
// Типы запросов/ответов — из backend/internal/auth/handler.go.
// =====================================================

import { AUTH_PREFIX } from "./config";
import { http, type ApiResult } from "./http";

/** purpose для VerifySmsCode (контракт backend). */
export type SmsPurpose = "login" | "registration";

// --- Ответы (форма из handler.go) ----------------------------------------

/** Ответ sendCode: { sent, demoCode?, debugCode? } (demoCode только в DEMO_MODE). */
export interface SendSmsResponse {
  sent?: boolean;
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

/** Профиль текущего пользователя (Bearer). */
export function me(): Promise<ApiResult<MeResponse>> {
  return http<MeResponse>(AUTH_PREFIX + "/me", { method: "GET", auth: true });
}
