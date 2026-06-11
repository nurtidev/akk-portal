'use client';

// =====================================================
// ===== Локализация текстов квиза UI-слоем ============
// Данные вопросов (src/data/questions.ts) остаются 1-в-1 с легаси на русском —
// это golden-зона. Переводы лежат в messages/*/funnel.json → funnel.questions
// и накладываются при рендере; нет перевода — показываем исходный текст.
// =====================================================

import { useMessages } from 'next-intl';
import { questionByKey, type Question } from '@/data/questions';

interface OptionL10n {
  label?: string;
  desc?: string;
}

interface QuestionL10n {
  short?: string;
  title?: string;
  hint?: string;
  options?: Record<string, OptionL10n>;
}

export interface QuestionL10nApi {
  title(q: Question): string;
  hint(q: Question): string | undefined;
  short(q: Question): string;
  shortByKey(key: string): string;
  optLabel(q: Question, value: string): string;
  optDesc(q: Question, value: string): string | undefined;
  /** Перевод подписи ответа из SoftFactor (там только русская строка). */
  answerLabel(key: string, label: string): string;
  /** Перевод bestLabel из SoftFactor — склейки подписей через « или ». */
  joinedAnswerLabels(key: string, joined: string): string;
}

export function useQuestionL10n(): QuestionL10nApi {
  const messages = useMessages() as {
    funnel?: { questions?: Record<string, QuestionL10n | string> };
  };
  const qm = messages.funnel?.questions ?? {};
  const orWord = typeof qm._or === 'string' ? qm._or : 'или';

  const l10n = (key: string): QuestionL10n => {
    const entry = qm[key];
    return typeof entry === 'object' && entry !== null ? entry : {};
  };
  const opt = (key: string, value: string): OptionL10n => l10n(key).options?.[value] ?? {};
  const dataOption = (q: Question, value: string) => q.options.find((o) => o.value === value);

  const optLabel = (q: Question, value: string) =>
    opt(q.key, value).label ?? dataOption(q, value)?.label ?? value;

  // Разбираем склейку «label1 или label2» обратно на подписи вопроса.
  // Подписи сами могут содержать « или » («Откорм или птицеводство»), поэтому
  // жадно матчим известные подписи с начала строки. Не разобрали — отдаём как есть.
  const splitJoined = (q: Question, joined: string): string[] | null => {
    const labels = q.options.map((o) => o.label).sort((a, b) => b.length - a.length);
    const parts: string[] = [];
    let rest = joined;
    while (rest.length > 0) {
      const hit = labels.find((l) => rest.startsWith(l));
      if (!hit) return null;
      parts.push(hit);
      rest = rest.slice(hit.length);
      if (rest.startsWith(' или ')) rest = rest.slice(5);
      else if (rest.length > 0) return null;
    }
    return parts;
  };

  const answerLabel = (key: string, label: string): string => {
    const q = questionByKey(key);
    const value = q?.options.find((o) => o.label === label)?.value;
    if (!q || value == null) return label;
    return optLabel(q, value);
  };

  return {
    title: (q) => l10n(q.key).title ?? q.title,
    hint: (q) => l10n(q.key).hint ?? q.hint,
    short: (q) => l10n(q.key).short ?? q.short,
    shortByKey: (key) => l10n(key).short ?? questionByKey(key)?.short ?? key,
    optLabel,
    optDesc: (q, value) => opt(q.key, value).desc ?? dataOption(q, value)?.desc,
    answerLabel,
    joinedAnswerLabels: (key, joined) => {
      const q = questionByKey(key);
      if (!q) return joined;
      const parts = splitJoined(q, joined);
      if (!parts) return joined;
      return parts.map((label) => answerLabel(key, label)).join(` ${orWord} `);
    },
  };
}
