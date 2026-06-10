// =====================================================
// ===== D1: submitApplication — точка интеграции трека B
// Трек B (визард подачи) вызывает этот хелпер с данными онбординга.
// Контракт описан в web/src/lib/api/README.md.
// =====================================================

import { accessToken } from "./tokens";
import { createApplication, type Application } from "./credit";
import type { ApiResult } from "./http";
import { PROGRAMS } from "@/data/programs";

/**
 * Полезная нагрузка подачи заявки от трека B.
 * Поля верхнего уровня — контракт createReq бэкенда; `onboarding` — произвольный
 * снимок воронки (ответы квиза, выбранная программа, параметры калькулятора, контакт).
 */
export interface SubmitApplicationPayload {
  /** Запрошенная сумма, ₸. */
  requestedAmount: number;
  /** Цель кредитования (категория программы или текст). */
  loanPurpose: string;
  /** id выбранной программы ('' — индивидуальная консультация). */
  programId: string;
  /** Снимок данных воронки (сериализуется как JSONB onboarding). */
  onboarding?: unknown;
}

/** Результат подачи: статус + созданная заявка (uid/number для перехода в кабинет). */
export interface SubmitResult {
  /** true → заявка создана. */
  ok: boolean;
  /** HTTP-статус (401 → требуется авторизация; -1 → бэкенд не сконфигурирован). */
  status: number;
  /** true → нужен вход/регистрация перед повторной отправкой. */
  needAuth: boolean;
  /** true → бэкенд недоступен (NEXT_PUBLIC_API_BASE пуст) — demo-режим. */
  unavailable: boolean;
  /** Созданная заявка (uid, number, …) при успехе. */
  application: Application | null;
  /** Текст ошибки (если ok === false и есть что показать). */
  error?: string;
}

/** true → есть валидный access-токен (можно подавать заявку без повторного входа). */
export function isAuthenticated(): boolean {
  return accessToken().length > 0;
}

// =====================================================
// ===== Адаптер под контракт трека B (FunnelRoot) =====
// FunnelRoot принимает проп submitApplication: (draft) => Promise<{ number }>.
// Тип ApplicationDraft живёт в зоне трека B (funnel/) — здесь его структурный
// аналог, чтобы не импортировать из чужой зоны. Передайте funnelSubmitAdapter
// в <FunnelRoot submitApplication={funnelSubmitAdapter} /> при стыковке.
// =====================================================

/** Структурный аналог funnel ApplicationDraft (см. funnel-context.tsx). */
export interface FunnelDraft {
  programId: string | null;
  amount: number;
  term: number;
  answers: unknown;
  callback: { name?: string; phone?: string; channel?: string } | null;
  stressRatio: number | null;
}

/**
 * Адаптер: преобразует draft воронки в payload и создаёт заявку.
 * Возвращает { number } (контракт SubmitResult трека B). Бросает Error при сбое —
 * визард трека B показывает ошибку. Для гостя/401 бросает ошибку с пометкой needAuth:
 * модалку логина следует открыть до старта визарда (визард доступен только после входа).
 */
export async function funnelSubmitAdapter(
  draft: FunnelDraft,
): Promise<{ number: string }> {
  const prog = draft.programId
    ? PROGRAMS.find((p) => p.id === draft.programId)
    : undefined;
  const purpose = prog
    ? prog.category || prog.title
    : "Индивидуальная консультация";

  const res = await submitApplication({
    requestedAmount: draft.amount || 0,
    loanPurpose: purpose,
    programId: draft.programId || "",
    onboarding: {
      answers: draft.answers,
      program: prog
        ? { id: prog.id, title: prog.title, category: prog.category }
        : null,
      params: { amount: draft.amount, term_months: draft.term },
      contact: draft.callback,
      stress_ratio: draft.stressRatio,
    },
  });
  if (res.ok && res.application) {
    return { number: res.application.number };
  }
  if (res.unavailable) {
    // Demo без бэкенда: возвращаем синтетический номер, чтобы экран успеха работал.
    const year = new Date().getFullYear();
    const rnd = Math.floor(100000 + Math.random() * 900000);
    return { number: `AKK-${year}-${rnd}` };
  }
  throw new Error(res.error || "Не удалось отправить заявку.");
}

/**
 * Создаёт заявку через POST /applications.
 *
 * Семантика для трека B:
 *  - если пользователь не авторизован → { needAuth: true } (откройте модалку логина,
 *    после входа вызовите submitApplication повторно с тем же payload);
 *  - 401 от бэкенда трактуется так же (needAuth: true);
 *  - при недоступном API (demo) → { unavailable: true } — покажите demo-успех;
 *  - при успехе → { ok: true, application } — переходите на /cabinet/applications/<uid>.
 */
export async function submitApplication(
  payload: SubmitApplicationPayload,
): Promise<SubmitResult> {
  if (!isAuthenticated()) {
    return {
      ok: false,
      status: 401,
      needAuth: true,
      unavailable: false,
      application: null,
    };
  }

  const r: ApiResult<Application> = await createApplication({
    requested_amount: payload.requestedAmount || 0,
    loan_purpose: payload.loanPurpose,
    program_id: payload.programId || "",
    onboarding: payload.onboarding,
  });

  if (r.unavailable) {
    return {
      ok: false,
      status: -1,
      needAuth: false,
      unavailable: true,
      application: null,
    };
  }
  if (r.status === 401) {
    return {
      ok: false,
      status: 401,
      needAuth: true,
      unavailable: false,
      application: null,
    };
  }
  if (!r.ok || !r.data) {
    const error =
      (r.data as { message?: string } | null)?.message ||
      "Не удалось отправить заявку.";
    return {
      ok: false,
      status: r.status,
      needAuth: false,
      unavailable: false,
      application: null,
      error,
    };
  }

  return {
    ok: true,
    status: r.status,
    needAuth: false,
    unavailable: false,
    application: r.data,
  };
}
