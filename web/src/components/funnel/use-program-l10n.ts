'use client';

// =====================================================
// ===== Локализация данных программ UI-слоем ==========
// Данные программ (src/data/programs.ts) остаются 1-в-1 с легаси на русском —
// это golden-зона (значения rate/maxAmount/hard/soft не трогаем). Переводы
// прозы лежат в messages/*/funnel.json → funnel.programData и накладываются
// при рендере; нет перевода — показываем исходный русский текст.
// Образец — use-question-l10n.ts.
// =====================================================

import { useMessages } from 'next-intl';
import { PROGRAM_DETAILS, type Program, type ProgramDetail } from '@/data/programs';

interface ProgramDetailL10n {
  summary?: string;
  spend?: string[];
  requirements?: string[];
  repayment?: string;
  note?: string;
  notFinanced?: string[];
}

interface ProgramL10n {
  title?: string;
  category?: string;
  description?: string;
  org?: string;
  rateTip?: string;
  rateRange?: string;
  rateNote?: string;
  scheduleNote?: string;
  detail?: ProgramDetailL10n;
}

export interface ProgramL10nApi {
  /** Локализованная копия программы (только текстовые поля; числа/правила не трогаем). */
  localize(p: Program): Program;
  /** Локализованные детали программы по id (для модалки). */
  detail(id: string): ProgramDetail | undefined;
  /** Короткий хелпер для мест, где на руках только id программы. */
  title(id: string, fallback: string): string;
  category(id: string, fallback: string): string;
}

export function useProgramL10n(): ProgramL10nApi {
  const messages = useMessages() as {
    funnel?: { programData?: Record<string, ProgramL10n> };
  };
  const pm = messages.funnel?.programData ?? {};

  const l10n = (id: string): ProgramL10n => {
    const entry = pm[id];
    return typeof entry === 'object' && entry !== null ? entry : {};
  };

  // Поэлементный overlay массива: индекс отсутствует в переводе → исходная строка.
  const localizeArray = (over: string[] | undefined, base: string[]): string[] =>
    base.map((s, i) => over?.[i] ?? s);

  const localize = (p: Program): Program => {
    const o = l10n(p.id);
    return {
      ...p,
      title: o.title ?? p.title,
      category: o.category ?? p.category,
      description: o.description ?? p.description,
      org: o.org ?? p.org,
      rateTip: o.rateTip ?? p.rateTip,
      rateRange: o.rateRange ?? p.rateRange,
      rateNote: o.rateNote ?? p.rateNote,
      scheduleNote: o.scheduleNote ?? p.scheduleNote,
    };
  };

  const detail = (id: string): ProgramDetail | undefined => {
    const base = PROGRAM_DETAILS[id];
    if (!base) return undefined;
    const o = l10n(id).detail;
    if (!o) return base;
    return {
      summary: o.summary ?? base.summary,
      spend: localizeArray(o.spend, base.spend),
      requirements: localizeArray(o.requirements, base.requirements),
      repayment: o.repayment ?? base.repayment,
      note: o.note ?? base.note,
      notFinanced: base.notFinanced
        ? localizeArray(o.notFinanced, base.notFinanced)
        : undefined,
    };
  };

  return {
    localize,
    detail,
    title: (id, fallback) => l10n(id).title ?? fallback,
    category: (id, fallback) => l10n(id).category ?? fallback,
  };
}
