// =====================================================
// ===== FAQ: голоса «Полезен ли ответ?» + обращения ===
// Публичные (без авторизации) эндпоинты бэкенда /api/v1/faq/*:
//   - POST /vote      — голос устройства за один вопрос (агрегат «N% полезно»)
//   - GET  /stats     — агрегаты по набору ключей (батчатся в один запрос)
//   - POST /question  — обращение «Не нашли ответ?» → уходит в поддержку/админку
// Голосует «устройство»: анонимный id в localStorage (akk-faq-voter). Свой голос
// дублируется в localStorage, чтобы показывать выбор при повторном заходе.
// =====================================================

import { http } from "./http";

/** Префикс группы маршрутов FAQ (контракт backend/cmd/server/main.go). */
export const FAQ_PREFIX = "/api/v1/faq";

const VOTER_KEY = "akk-faq-voter";
const MY_VOTES_KEY = "akk-faq-myvotes";

/** Агрегат по одному вопросу FAQ. */
export interface FaqStat {
  helpful: number;
  total: number;
  percent: number;
}

/** Анонимный идентификатор устройства (создаётся при первом голосе). */
export function voterId(): string {
  if (typeof window === "undefined") return "";
  try {
    let id = localStorage.getItem(VOTER_KEY);
    if (!id) {
      id =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem(VOTER_KEY, id);
    }
    return id;
  } catch {
    return "";
  }
}

/** Свой голос за вопрос из localStorage (true/false), либо null. */
export function getMyVote(itemKey: string): boolean | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(MY_VOTES_KEY);
    if (!raw) return null;
    const map = JSON.parse(raw) as Record<string, boolean>;
    return itemKey in map ? map[itemKey] : null;
  } catch {
    return null;
  }
}

/** Запомнить свой голос за вопрос. */
export function setMyVote(itemKey: string, helpful: boolean): void {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(MY_VOTES_KEY);
    const map = raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
    map[itemKey] = helpful;
    localStorage.setItem(MY_VOTES_KEY, JSON.stringify(map));
  } catch {
    /* localStorage недоступен — не критично */
  }
}

// --- Батч-загрузка статистики --------------------------------------------
// Несколько FaqFeedback на странице монтируются в один тик — собираем их ключи
// и запрашиваем одним GET /stats, затем раздаём каждому его подмножество.

interface PendingReq {
  keys: string[];
  resolve: (m: Record<string, FaqStat>) => void;
}
let queue: PendingReq[] = [];
let flushScheduled = false;

async function fetchStats(keys: string[]): Promise<Record<string, FaqStat>> {
  if (keys.length === 0) return {};
  const qs = encodeURIComponent(keys.join(","));
  const r = await http<{ stats: Record<string, FaqStat> }>(
    `${FAQ_PREFIX}/stats?keys=${qs}`,
    { method: "GET" },
  );
  if (r.ok && r.data && typeof r.data === "object" && r.data.stats) {
    return r.data.stats;
  }
  return {};
}

function scheduleFlush(): void {
  if (flushScheduled) return;
  flushScheduled = true;
  const run = async () => {
    const reqs = queue;
    queue = [];
    flushScheduled = false;
    const allKeys = Array.from(new Set(reqs.flatMap((r) => r.keys)));
    let map: Record<string, FaqStat> = {};
    try {
      map = await fetchStats(allKeys);
    } catch {
      map = {};
    }
    for (const r of reqs) {
      const subset: Record<string, FaqStat> = {};
      for (const k of r.keys) if (map[k]) subset[k] = map[k];
      r.resolve(subset);
    }
  };
  if (typeof queueMicrotask === "function") queueMicrotask(run);
  else setTimeout(run, 0);
}

/** Агрегаты по набору ключей. Пустой объект — если голосов нет или бэк недоступен. */
export function getFaqStats(keys: string[]): Promise<Record<string, FaqStat>> {
  return new Promise((resolve) => {
    queue.push({ keys, resolve });
    scheduleFlush();
  });
}

// --- Голос и обращение ----------------------------------------------------

/** Отдать голос за вопрос. Возвращает свежий агрегат либо null (бэк недоступен). */
export async function voteFaq(
  itemKey: string,
  helpful: boolean,
): Promise<FaqStat | null> {
  const r = await http<FaqStat & { item_key: string }>(`${FAQ_PREFIX}/vote`, {
    method: "POST",
    body: { item_key: itemKey, voter: voterId(), helpful },
  });
  if (r.ok && r.data) {
    setMyVote(itemKey, helpful);
    return { helpful: r.data.helpful, total: r.data.total, percent: r.data.percent };
  }
  return null;
}

/** Данные обращения «Не нашли ответ?». */
export interface SupportQuestionInput {
  itemKey?: string;
  scope?: string;
  question: string;
  contact?: string;
  locale?: string;
}

/** Отправить обращение в поддержку. true → принято бэкендом. */
export async function askSupport(input: SupportQuestionInput): Promise<boolean> {
  const r = await http(`${FAQ_PREFIX}/question`, {
    method: "POST",
    body: {
      item_key: input.itemKey ?? "",
      scope: input.scope ?? "",
      question: input.question,
      contact: input.contact ?? "",
      locale: input.locale ?? "",
    },
  });
  return r.ok;
}
