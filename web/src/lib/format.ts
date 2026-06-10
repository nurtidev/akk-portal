// =====================================================
// ===== A7: format (fmtAmount / fmtRate / declension)
// fmtAmount и declension — перенос 1-в-1 из index.html (≈ строки 2865–2897).
//
// fmtRate: легаси-версия (≈3112–3118) возвращает HTML с тултипом-глоссарием
// и зависит от DOM (escAttr). Здесь — чистая версия: считаем ту же бизнес-логику
// (запятая-десятичный разделитель, префикс «от »/«≈ », наличие диапазона/тултипа),
// но отдаём СТРУКТУРУ, а не строку HTML — разметку рисует web-слой.
// `fmtRate(p).text` совпадает с видимым текстом легаси (без обёрток <span>).
// =====================================================

import type { Program } from '../data/programs';

/** Форматирование суммы в ₸ с укрупнением (млрд / млн / тыс). Перенос дословно. */
export function fmtAmount(v: number): string {
  if (v >= 1e9) return (Math.round(v / 1e8) / 10).toLocaleString('ru-RU') + ' млрд ₸';
  if (v >= 1e6) return Math.round(v / 1e6).toLocaleString('ru-RU') + ' млн ₸';
  if (v >= 1e3) return Math.round(v / 1e3).toLocaleString('ru-RU') + ' тыс ₸';
  return Math.round(v).toLocaleString('ru-RU') + ' ₸';
}

/** Склонение по числу: 1 год / 2 года / 5 лет. Перенос дословно. */
export function declension(n: number, one: string, few: string, many: string): string {
  const m = Math.abs(n) % 100;
  if (m >= 11 && m <= 14) return many;
  const r = m % 10;
  if (r === 1) return one;
  if (r >= 2 && r <= 4) return few;
  return many;
}

export interface RateDisplay {
  /** Видимый текст ставки (совпадает с легаси-выводом без HTML-обёрток). */
  text: string;
  /** true → у программы есть диапазон (показывать «≈», с тултипом); false → «от». */
  hasRange: boolean;
  /** Текст тултипа (rateTip || rateRange), если есть диапазон; иначе undefined. */
  tip?: string;
}

/**
 * Отображение ставки.
 *  - есть rateRange → «≈ {rate}%» + тултип (rateTip || rateRange);
 *  - иначе → «от {rate}%».
 * Десятичный разделитель — запятая (как в легаси: String(rate).replace('.', ',')).
 */
export function fmtRate(p: Pick<Program, 'rate' | 'rateRange' | 'rateTip'>): RateDisplay {
  const rateStr = String(p.rate).replace('.', ',');
  if (p.rateRange) {
    return {
      text: '≈ ' + rateStr + '%',
      hasRange: true,
      tip: p.rateTip || p.rateRange
    };
  }
  return {
    text: 'от ' + rateStr + '%',
    hasRange: false
  };
}
