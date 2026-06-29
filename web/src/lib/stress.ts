// =====================================================
// ===== A6: stress (calculateStress — Fajr-lite)
// Перенос 1-в-1 из index.html (≈ строки 3868–3968), расчётная часть.
// Параметризован: program + calc({amount,term}) + входные данные стресс-теста
// (в легаси бралось из глобального state.selectedProgram / state.calc / state.stress).
// Тексты вердиктов сохранены дословно.
// =====================================================

import type { Program } from '../data/programs';
import { FAJR_NORMS, type AnimalType } from '../data/fajr-norms';
import { calculateSchedule } from './schedule';

/** Параметры выбранного калькулятора. */
export interface StressCalc {
  amount: number;
  term: number;
}

/**
 * Ввод стресс-теста. Числовые поля принимаются как в легаси — строкой или числом
 * (применяется Number()). Денежные поля в «удобных» единицах:
 *  - existingDebtsMonthly — тыс ₸/мес (×1000 внутри);
 *  - annualRevenue — млн ₸/год (×1e6 внутри).
 */
export interface StressInput {
  animalType?: AnimalType | string;
  existingHerd?: number | string;
  plannedHerd?: number | string;
  pasturesHa?: number | string;
  barnSqm?: number | string;
  existingDebtsMonthly?: number | string;
  annualRevenue?: number | string;
}

export type VerdictLevel = 'ok' | 'warn' | 'bad';

export interface Verdict {
  level: VerdictLevel;
  icon: string;
  title: string;
  text: string;
}

export interface StressResult {
  verdict: Verdict;
  animalLabel: string;
  expectedIncome: number;
  yearlyCosts: number;
  netIncome: number;
  yearlyPayment: number;
  existingDebtsYearly: number;
  totalYearlyPayment: number;
  ratio: number;
  pastureNeeded: number;
  pastureOk: boolean;
  barnNeeded: number;
  barnOk: boolean;
  totalHerd: number;
}

/**
 * Расчёт Fajr-lite: «хватит ли ресурсов проекта».
 *  Доход (кэш/год) = приплод на продажу + выбраковка взрослых + молоко (только КРС) + доп.доход.
 *  Расход = (корма + ветеринария + прочие) × поголовье.
 *  Чистый доход = Доход − Расход.
 *  Совокупный годовой платёж = СРЕДНЕГОДОВОЙ платёж по графику + текущие × 12.
 *  ratio = платёж / чистый доход × 100% (или 999, если чистый доход ≤ 0).
 *  Сначала проверяются пастбища (га × норматив) и помещения (м² × минимум),
 *  затем нагрузка на доход (<60 / 60–100 / ≥100%).
 *
 * ⚠️ DRAFT 2026-06-29: модель дохода переработана (добавлен приплод, снижена
 * себестоимость до пастбищной, платёж берётся среднегодовой, а не пиковый 1-го
 * года) — прежняя версия давала отрицательный чистый доход почти на любом стаде.
 * Коэффициенты в FAJR_NORMS и пороги вердикта — ЧЕРНОВЫЕ, сверить с бизнесом.
 */
export function calculateStress(program: Program, calc: StressCalc, stress: StressInput): StressResult {
  const p = program;
  const c = calc;
  const sch = calculateSchedule(p, c.amount, c.term);

  const animalType = stress.animalType || 'KRS';
  const norms = FAJR_NORMS[animalType as AnimalType] || FAJR_NORMS.KRS;

  const existing = Number(stress.existingHerd) || 0;
  const planned = Number(stress.plannedHerd) || 0;
  const pastures = Number(stress.pasturesHa) || 0;
  const barn = Number(stress.barnSqm) || 0;
  const existingDebtsMonthly = Number(stress.existingDebtsMonthly) * 1000 || 0;
  const annualRevenue = Number(stress.annualRevenue) * 1e6 || 0;

  const totalHerd = existing + planned;

  // Доход от приплода (главный возврат скотоводства): маток × выход приплода ×
  // доля на продажу × цена молодняка. (DRAFT-коэффициенты, см. FAJR_NORMS.)
  const breedingStock = Math.round(totalHerd * norms.breedingShare);
  const youngForSale = Math.round(breedingStock * norms.calvingRate * norms.youngSaleShare);
  const youngRevenue = youngForSale * norms.youngSalePrice;

  // Доход от молока (только КРС: ~50% маточного поголовья дают молоко)
  const cowCount = Math.round(totalHerd * norms.cowShare);
  const milkRevenue = cowCount * norms.milkPerDay * norms.lactationDays * norms.milkPricePerL;

  // Доход от мяса (годовая выбраковка/реализация взрослого поголовья)
  const meatRevenue = Math.round(totalHerd * norms.saleShare) * norms.avgWeightSale * norms.meatPricePerKg;

  const expectedIncome = youngRevenue + milkRevenue + meatRevenue + annualRevenue;
  const yearlyCosts = totalHerd * (norms.yearlyFeedCost + norms.yearlyVetCost + norms.yearlyOther);
  const netIncome = expectedIncome - yearlyCosts;

  // Платёж по новому кредиту + существующие обязательства (упрощение из ПКБ).
  // Берём среднегодовой платёж по графику (а не пиковый 1-й год) — стресс-тест
  // запускается только для annual-программ (Игілік/Береке), где это поле определено.
  const yearlyPayment = (sch as { avgPayment: number }).avgPayment;
  const existingDebtsYearly = existingDebtsMonthly * 12;
  const totalYearlyPayment = yearlyPayment + existingDebtsYearly;

  const ratio = netIncome > 0 ? (totalYearlyPayment / netIncome) * 100 : 999;

  // Требования по пастбищам и помещениям
  const pastureNeeded = totalHerd * norms.pastureHaPerHead;
  const pastureOk = pastures >= pastureNeeded;
  const barnNeeded = totalHerd * norms.minBarnSqmPerHead;
  const barnOk = barn >= barnNeeded;

  let verdict: Verdict;
  if (!pastureOk) {
    verdict = {
      level: 'warn',
      icon: '!',
      title: 'Недостаточно пастбищ',
      text: 'Для стада ' + totalHerd + ' голов (' + norms.label + ') нужно минимум ' +
        pastureNeeded.toFixed(0) + ' га пастбищ (норматив ' + norms.pastureHaPerHead +
        ' га/голову). У вас ' + pastures + ' га. Возможные варианты — аренда пастбищ у соседних хозяйств или договоры о совместной деятельности.'
    };
  } else if (!barnOk) {
    verdict = {
      level: 'warn',
      icon: '!',
      title: 'Недостаточно помещений',
      text: 'Для стада ' + totalHerd + ' голов нужно минимум ' + barnNeeded.toFixed(0) +
        ' м² помещений (норматив ' + norms.minBarnSqmPerHead + ' м²/голову). У вас ' + barn +
        ' м². Часть займа можно направить на строительно-монтажные работы (СМР).'
    };
  } else if (ratio < 60) {
    verdict = {
      level: 'ok',
      icon: '✓',
      title: 'Платёж комфортный',
      text: 'Совокупный годовой платёж' + (existingDebtsYearly > 0 ? ' (включая текущие обязательства)' : '') +
        ' составляет около ' + ratio.toFixed(0) + '% от ожидаемого чистого дохода — это безопасный уровень. Скорее всего проект пройдёт финансовую экспертизу.'
    };
  } else if (ratio < 100) {
    verdict = {
      level: 'warn',
      icon: '!',
      title: 'Платёж напряжённый',
      text: 'Совокупный годовой платёж — около ' + ratio.toFixed(0) + '% чистого дохода. Это рабочий, но напряжённый уровень: пригодятся резервы, более длинный срок или льготный период по графику.'
    };
  } else {
    verdict = {
      level: 'bad',
      icon: '✕',
      title: 'Платёж может быть тяжёлым',
      text: 'Совокупный годовой платёж — около ' + ratio.toFixed(0) + '% чистого дохода. Это высокая нагрузка. Рекомендуем рассмотреть меньшую сумму, более длинный срок или льготный период по графику.'
    };
  }

  return {
    verdict: verdict,
    animalLabel: norms.label,
    expectedIncome: expectedIncome,
    yearlyCosts: yearlyCosts,
    netIncome: netIncome,
    yearlyPayment: yearlyPayment,
    existingDebtsYearly: existingDebtsYearly,
    totalYearlyPayment: totalYearlyPayment,
    ratio: ratio,
    pastureNeeded: pastureNeeded,
    pastureOk: pastureOk,
    barnNeeded: barnNeeded,
    barnOk: barnOk,
    totalHerd: totalHerd
  };
}
