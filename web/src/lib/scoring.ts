// =====================================================
// ===== A4: scoring (scoreProgram / explainProgram / scoredPrograms)
// Перенос 1-в-1 из index.html (≈ строки 2944–2992, 3055–3060).
// `scoredPrograms` параметризован answers (в легаси — глобальный state.answers).
// =====================================================

import { PROGRAMS, type Program } from '../data/programs';
import { optionLabel, questionShort, type Answers } from '../data/questions';

/** Один мягкий фактор разбора подбора. */
export interface SoftFactor {
  /** Ключ вопроса. */
  q: string;
  /** Короткое имя вопроса. */
  short: string;
  /** Подпись фактического ответа пользователя. */
  label: string;
  /** Сколько баллов реально дал ответ. */
  w: number;
  /** Максимум баллов по этому вопросу (потолок). */
  maxW: number;
  /** Ответ(ы), дающие максимум — подсказка «что подошло бы лучше». */
  bestLabel: string;
}

export interface Explanation {
  passedHard: boolean;
  softFactors: SoftFactor[];
  rawScore: number;
  /** null, если не прошёл hard-фильтры; иначе min(100, rawScore). */
  score: number | null;
}

export interface ScoredProgram {
  program: Program;
  score: number;
}

// Разбор программы: проходит ли по жёстким условиям + из чего сложился процент.
// softFactors — мягкие правила, сгруппированные по вопросу. Для каждого вопроса:
// w — сколько баллов реально дал ответ пользователя, maxW — максимум по этому вопросу.
// Если w < maxW — это и есть «почему не 100%».
export function explainProgram(prog: Program, answers: Answers): Explanation {
  const passedHard = prog.hard.every(function (rule) {
    return rule.v.includes(answers[rule.q] as string);
  });
  // Группируем мягкие правила по вопросу, сохраняя порядок появления.
  const byQ: Record<string, Program['soft']> = {};
  const order: string[] = [];
  prog.soft.forEach(function (rule) {
    if (!byQ[rule.q]) { byQ[rule.q] = []; order.push(rule.q); }
    byQ[rule.q].push(rule);
  });
  const softFactors: SoftFactor[] = [];
  order.forEach(function (q) {
    const have = answers[q as keyof Answers];
    // Вопрос не задавался в этом сценарии (напр. вид животных вне покупки скота) — пропускаем.
    if (have == null) return;
    let maxW = 0;
    let matched: Program['soft'][number] | null = null;
    byQ[q].forEach(function (r) {
      if (r.w > maxW) maxW = r.w;
      if (matched == null && r.v.includes(have)) matched = r;
    });
    // Ответы, дающие максимум по этому вопросу — нужны для подсказки «что подошло бы лучше».
    const bestValues: string[] = [];
    byQ[q].forEach(function (r) {
      if (r.w !== maxW) return;
      r.v.forEach(function (v) { if (bestValues.indexOf(v) === -1) bestValues.push(v); });
    });
    softFactors.push({
      q: q,
      short: questionShort(q),
      label: optionLabel(q, have),   // фактический ответ пользователя
      w: matched ? (matched as Program['soft'][number]).w : 0,    // сколько баллов он принёс
      maxW: maxW,                    // потолок по этому вопросу
      bestLabel: bestValues.map(function (v) { return optionLabel(q, v); }).join(' или ')
    });
  });
  const rawScore = softFactors.reduce(function (s, f) { return s + f.w; }, 0);
  return {
    passedHard: passedHard,
    softFactors: softFactors,
    rawScore: rawScore,
    score: passedHard ? Math.min(100, rawScore) : null
  };
}

export function scoreProgram(prog: Program, answers: Answers): number | null {
  return explainProgram(prog, answers).score;
}

/**
 * Программы, прошедшие hard-фильтры и набравшие score >= 20,
 * отсортированные по убыванию score. indirectOnly-программы отсекаются
 * естественно (у них hard `__never__`), отдельной фильтрации не нужно.
 */
export function scoredPrograms(answers: Answers): ScoredProgram[] {
  return PROGRAMS
    .map(function (p) { return { program: p, score: scoreProgram(p, answers) }; })
    .filter(function (x): x is ScoredProgram { return x.score !== null && x.score >= 20; })
    .sort(function (a, b) { return b.score - a.score; });
}
