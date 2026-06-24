// =====================================================
// ===== Мост-сессия creditapp (по ИИН заёмщика) =======
// ПРОБЛЕМА: creditapp credit-backend проверяет borrower-токен СВОИМ JWT-
// секретом и ищет заёмщика в СВОЕЙ базе. Токен akk-backend он НЕ примет.
// РЕШЕНИЕ: для кредитных вызовов портал получает ОТДЕЛЬНУЮ creditapp-сессию
// по ИИН заёмщика (известен после входа на akk-backend) и кеширует её
// creditapp access-токен в localStorage['akk-credit-token'].
//
// Бутстрап (всё на CREDIT_API_BASE):
//   1. POST /auth/Account/registerPhysical  (409/already → не ошибка)
//   2. POST /auth/Account/RequestSms
//   3. POST /auth/Account/VerifySmsCode (code:"111111") → {accessToken,...}
// Демо-код 111111 фиксирован на стенде creditapp.
//
// Личность заёмщика берём из akk-backend сессии: profileFromTokens(loadTokens()).
// akk-backend кладёт ПОЛНЫЙ iin в JWT-claims (backend/internal/auth/jwt.go
// Claims.IIN = c.IIN), поэтому iin доступен без сетевого вызова; /me — fallback.
// =====================================================

import { CREDIT_API_BASE, CREDIT_AUTH_PREFIX, CREDIT_TOKEN_KEY, creditApiAvailable } from "./config";
import { loadTokens, profileFromTokens, parseJwt, type UserProfile } from "./tokens";

const isBrowser = typeof window !== "undefined";

/** Личность заёмщика для бутстрапа creditapp-сессии. */
interface BorrowerIdentity {
  iin: string;
  lastName: string;
  firstName: string;
  middleName: string;
  phone: string;
}

// Кеш creditapp-токена ПРИВЯЗАН к ИИН заёмщика, под которого он выпущен.
// Без этого при смене пользователя akk-backend (демо с несколькими юзерами)
// переиспользовался бы чужой токен → заявка уходила под прошлого заёмщика.
const CREDIT_IIN_KEY = CREDIT_TOKEN_KEY + "-iin";

/** Прочитать кешированный creditapp-токен из localStorage. */
function loadCreditToken(): string {
  if (!isBrowser) return "";
  try {
    return localStorage.getItem(CREDIT_TOKEN_KEY) || "";
  } catch {
    return "";
  }
}

/** ИИН, под который выпущен кешированный creditapp-токен. */
function loadCreditTokenIIN(): string {
  if (!isBrowser) return "";
  try {
    return localStorage.getItem(CREDIT_IIN_KEY) || "";
  } catch {
    return "";
  }
}

/** Сохранить creditapp-токен в localStorage вместе с ИИН-владельцем. */
function saveCreditToken(token: string, iin: string): void {
  if (!isBrowser) return;
  try {
    localStorage.setItem(CREDIT_TOKEN_KEY, token);
    localStorage.setItem(CREDIT_IIN_KEY, iin);
  } catch {
    /* приватный режим / квота — игнорируем */
  }
}

/** Сбросить кешированный creditapp-токен (вызов при 401 / смене пользователя). */
export function clearCreditToken(): void {
  if (!isBrowser) return;
  try {
    localStorage.removeItem(CREDIT_TOKEN_KEY);
    localStorage.removeItem(CREDIT_IIN_KEY);
  } catch {
    /* игнорируем */
  }
}

/** Разбить profile.name на lastName / firstName (первое слово — фамилия). */
function splitName(profile: UserProfile, iin: string): { lastName: string; firstName: string; middleName: string } {
  // Сначала пробуем claims.lastName/firstName (точнее, чем дробление name).
  const claims = (() => {
    try {
      const t = loadTokens();
      return t.accessToken ? parseJwt(t.accessToken) : {};
    } catch {
      return {};
    }
  })();
  const clLast = typeof claims.lastName === "string" ? claims.lastName.trim() : "";
  const clFirst = typeof claims.firstName === "string" ? claims.firstName.trim() : "";
  if (clLast || clFirst) {
    return {
      lastName: clLast || clFirst || "Заёмщик",
      firstName: clFirst || clLast || iin,
      middleName: "",
    };
  }

  const parts = (profile.name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return { lastName: "Заёмщик", firstName: iin, middleName: "" };
  }
  if (parts.length === 1) {
    return { lastName: parts[0], firstName: parts[0], middleName: "" };
  }
  const [lastName, firstName, ...rest] = parts;
  return { lastName, firstName, middleName: rest.join(" ") };
}

/**
 * Личность заёмщика из akk-backend сессии.
 * iin берём из JWT-claims (profileFromTokens); если iin недоступен — null
 * (credit уходит в demo-fallback). /me не дёргаем: akk-backend кладёт iin в claims.
 */
function resolveBorrowerIdentity(): BorrowerIdentity | null {
  const profile = profileFromTokens(loadTokens());
  const iin = (profile.iin || "").trim();
  // ИИН РК — 12 цифр. Маскированный/пустой iin не годится для creditapp.
  if (!/^\d{12}$/.test(iin)) return null;

  const { lastName, firstName, middleName } = splitName(profile, iin);
  const phone = (profile.phone || "").trim() || "+77000000000";

  return { iin, lastName, firstName, middleName, phone };
}

/** Сгенерировать пароль для регистрации физлица (>=8, буквы+цифры). */
function generatePassword(): string {
  const rnd =
    typeof crypto !== "undefined" && crypto.getRandomValues
      ? Array.from(crypto.getRandomValues(new Uint32Array(2)))
          .map((n) => n.toString(36))
          .join("")
      : Math.random().toString(36).slice(2) + Date.now().toString(36);
  // "Akk" гарантирует заглавную+строчные буквы, rnd добавляет цифры/буквы.
  return ("Akk" + rnd + "9").slice(0, 24);
}

/** Низкоуровневый POST на CREDIT_API_BASE (без Authorization). Никогда не бросает. */
async function creditPost<T>(
  path: string,
  body: unknown,
): Promise<{ ok: boolean; status: number; data: T | null }> {
  try {
    const res = await fetch(CREDIT_API_BASE + path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
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
}

/** Ответ VerifySmsCode creditapp. */
interface CreditVerifyResponse {
  accessToken?: string;
  refreshToken?: string;
  verified?: boolean;
}

/**
 * Бутстрап creditapp-сессии: registerPhysical → RequestSms → VerifySmsCode.
 * Возвращает свежий accessToken либо null при сбое.
 */
async function bootstrapCreditSession(id: BorrowerIdentity): Promise<string | null> {
  // a. Регистрация физлица. 409/«already registered» — НЕ ошибка (заёмщик заведён).
  await creditPost(CREDIT_AUTH_PREFIX + "/registerPhysical", {
    iin: id.iin,
    lastName: id.lastName,
    firstName: id.firstName,
    middleName: id.middleName || undefined,
    phoneNumber: id.phone,
    password: generatePassword(),
  });
  // Ответ намеренно игнорируем: 201 (создан) и 409 (уже есть) одинаково годятся;
  // другие коды всё равно проверятся ниже на этапе VerifySmsCode.

  // b. Запрос SMS.
  await creditPost(CREDIT_AUTH_PREFIX + "/RequestSms", { iin: id.iin });

  // c. Подтверждение демо-кодом → токен.
  const verify = await creditPost<CreditVerifyResponse>(CREDIT_AUTH_PREFIX + "/VerifySmsCode", {
    iin: id.iin,
    code: "111111",
    purpose: "login",
  });

  const token = verify.data?.accessToken?.trim() || "";
  if (!verify.ok || !token) return null;

  saveCreditToken(token, id.iin);
  return token;
}

/**
 * creditapp access-токен (с кешем).
 * 1. Если в кеше есть токен — вернуть его (протухание ловим лениво по 401).
 * 2. Иначе — бутстрап по ИИН заёмщика из akk-backend сессии.
 * Возвращает null, если creditapp не сконфигурирован или ИИН недоступен
 * (тогда credit уходит в demo-fallback).
 */
export async function getCreditToken(): Promise<string | null> {
  if (!creditApiAvailable) return null;

  const id = resolveBorrowerIdentity();
  if (!id) return null;

  // Кеш валиден ТОЛЬКО если выпущен под текущего заёмщика akk-backend.
  // Иначе (смена пользователя на демо) сбрасываем и пере-бутстрапим.
  const cached = loadCreditToken();
  if (cached && loadCreditTokenIIN() === id.iin) return cached;

  clearCreditToken();
  return bootstrapCreditSession(id);
}

/**
 * Перебутстрап creditapp-сессии (вызов при 401: кеш сбрасывается, делается
 * ОДНА новая попытка bootstrap). Возвращает новый токен либо null.
 */
export async function refreshCreditToken(): Promise<string | null> {
  if (!creditApiAvailable) return null;
  clearCreditToken();

  const id = resolveBorrowerIdentity();
  if (!id) return null;

  return bootstrapCreditSession(id);
}
