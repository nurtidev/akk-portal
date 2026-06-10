// =====================================================
// ===== A5: schedule (calculateSchedule / effectiveMaxTerm / pickInitialTerm)
// Перенос 1-в-1 из index.html (≈ строки 2993–3053).
// `effectiveMaxTerm` параметризован answers (в легаси — глобальный state.answers).
// Формулы упрощены — это публичный pre-screen.
// =====================================================

import type { Program } from '../data/programs';
import type { Answers } from '../data/questions';

export interface BiannualPayment {
  label: string;
  amount: number;
  interest: number;
  note: string;
}

export interface BiannualSchedule {
  type: 'biannual';
  payments: BiannualPayment[];
  total: number;
  overpay: number;
}

export interface AnnualYear {
  year: number;
  principal: number;
  interest: number;
  payment: number;
}

export interface AnnualSchedule {
  type: 'annual';
  years: number;
  yearly: AnnualYear[];
  firstYearPayment: number;
  lastYearPayment: number;
  avgPayment: number;
  total: number;
  overpay: number;
}

export type Schedule = BiannualSchedule | AnnualSchedule;

/**
 * Стартовый срок калькулятора — наибольший из [12,24,36,48,60,84], не превышающий maxT.
 * Если maxT меньше 12 — возвращается сам maxT.
 */
export function pickInitialTerm(maxT: number): number {
  const opts = [12, 24, 36, 48, 60, 84];
  for (let i = opts.length - 1; i >= 0; i--) {
    if (opts[i] <= maxT) return opts[i];
  }
  return maxT;
}

/**
 * Потолок срока для калькулятора: если у программы есть termByPurpose и выбрана
 * цель — берётся минимум из maxTerm и лимита по цели; иначе общий maxTerm.
 */
export function effectiveMaxTerm(p: Program, answers: Answers): number {
  const purpose = answers.purpose;
  if (p.termByPurpose && purpose && p.termByPurpose[purpose]) {
    return Math.min(p.maxTerm, p.termByPurpose[purpose] as number);
  }
  return p.maxTerm;
}

/**
 * График погашения. Две схемы:
 *  - biannual_winter: 50% до 05 декабря + 50% до 05 марта; проценты —
 *    8 мес на полную сумму (до декабря) + 3 мес на остаток (декабрь→март).
 *  - annual: линейное тело (amount/years) + проценты на остаток (remaining*rate/100).
 */
export function calculateSchedule(program: Program, amount: number, termMonths: number): Schedule {
  const rate = program.rate;
  if (program.scheduleType === 'biannual_winter') {
    const r = rate / 100 / 12;
    const half = amount / 2;
    const monthsToDec = 8;
    const monthsDecToMar = 3;
    const intDec = amount * r * monthsToDec;
    const intMar = half * r * monthsDecToMar;
    return {
      type: 'biannual',
      payments: [
        { label: '05 декабря', amount: half + intDec, interest: intDec, note: 'после уборки урожая' },
        { label: '05 марта', amount: half + intMar, interest: intMar, note: 'окончательный расчёт' }
      ],
      total: amount + intDec + intMar,
      overpay: intDec + intMar
    };
  }
  const years = Math.max(1, Math.round(termMonths / 12));
  const annualPrincipal = amount / years;
  let totalInterest = 0;
  let remaining = amount;
  const yearly: AnnualYear[] = [];
  for (let y = 1; y <= years; y++) {
    const yearInterest = remaining * rate / 100;
    totalInterest += yearInterest;
    yearly.push({
      year: y,
      principal: annualPrincipal,
      interest: yearInterest,
      payment: annualPrincipal + yearInterest
    });
    remaining -= annualPrincipal;
  }
  return {
    type: 'annual',
    years: years,
    yearly: yearly,
    firstYearPayment: yearly[0].payment,
    lastYearPayment: yearly[yearly.length - 1].payment,
    avgPayment: (amount + totalInterest) / years,
    total: amount + totalInterest,
    overpay: totalInterest
  };
}
