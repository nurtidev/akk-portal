// =====================================================
// ===== B7: analytics (track) =========================
// Перенос из index.html (≈ строки 2830–2860): track(name, payload).
// Список событий и payload — строго по таблице README «Аналитика и events».
//
// Сейчас: console.log + кольцевой буфер последних событий (для презентации
// и будущего экспорта). Интерфейс рассчитан на подключение реального
// коллектора (GA4 / Яндекс.Метрика / собственный) через registerSink().
// =====================================================

/** Имена событий воронки — строго по таблице README. */
export type FunnelEventName =
  | 'page_loaded'
  | 'quiz_started'
  | 'quiz_answer'
  | 'quiz_completed'
  | 'quiz_step_jump'
  | 'results_viewed'
  | 'program_detail_open'
  | 'calculator_amount'
  | 'calculator_term'
  | 'apply_clicked'
  | 'apply_direct'
  | 'stress_test_opened'
  | 'stress_test_completed'
  | 'stress_test_skipped'
  | 'callback_form_opened'
  | 'consultation_requested'
  | 'lead_submitted'
  | 'success_shown'
  | 'flow_reset';

export type TrackPayload = Record<string, unknown>;

export interface AnalyticsEvent {
  name: string;
  payload: TrackPayload;
  at: Date;
}

/** Сток событий — точка подключения внешнего коллектора. */
export type AnalyticsSink = (event: AnalyticsEvent) => void;

// Кольцевой буфер последних событий (как боковая панель в легаси).
const buffer: AnalyticsEvent[] = [];
const MAX_BUFFER = 50;

// Дополнительные стоки (GA4/Метрика подключатся здесь — трек E3).
const sinks: AnalyticsSink[] = [];

/**
 * Регистрирует внешний коллектор. Возвращает функцию отписки.
 * Пока не используется — задел под трек E3.
 */
export function registerSink(sink: AnalyticsSink): () => void {
  sinks.push(sink);
  return () => {
    const i = sinks.indexOf(sink);
    if (i !== -1) sinks.splice(i, 1);
  };
}

/**
 * Отправить событие воронки. Имя и payload — по таблице README.
 * Сейчас пишет в console.log и в буфер; дополнительно — в зарегистрированные стоки.
 */
export function track(name: FunnelEventName | string, payload: TrackPayload = {}): void {
  const event: AnalyticsEvent = { name, payload, at: new Date() };
  buffer.unshift(event);
  if (buffer.length > MAX_BUFFER) buffer.pop();
  if (typeof console !== 'undefined') {
    // Префикс «[АКК]» — как в легаси, для узнаваемости в консоли.
    console.log('[АКК]', name, payload);
  }
  for (let i = 0; i < sinks.length; i++) {
    try {
      sinks[i](event);
    } catch {
      // сток не должен ронять воронку
    }
  }
}

/** Снимок последних событий (для отладки/презентации). */
export function getEvents(): AnalyticsEvent[] {
  return buffer.slice();
}
