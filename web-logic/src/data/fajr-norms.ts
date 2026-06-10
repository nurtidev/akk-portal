// =====================================================
// ===== A3: FAJR_NORMS (упрощённые из FAJROptions) ====
// Перенос 1-в-1 из index.html (≈ строки 2751–2811).
// Источник — внутренний документ АКК (модель Fajr).
// КОЭФФИЦИЕНТЫ НЕ МЕНЯТЬ — от них зависят суммы стресс-теста.
// =====================================================

/** Виды животных, по которым заданы нормативы. */
export type AnimalType = 'KRS' | 'MRS' | 'HORSE' | 'CAMEL';

export interface FajrNorm {
  label: string;
  /** Доля коров (для расчёта молока). */
  cowShare: number;
  /** Литров/день. */
  milkPerDay: number;
  /** Дней лактации. */
  lactationDays: number;
  /** ₸/литр. */
  milkPricePerL: number;
  /** Кг при реализации. */
  avgWeightSale: number;
  /** ₸/кг. */
  meatPricePerKg: number;
  /** Годовая доля выбраковки/реализации. */
  saleShare: number;
  /** ₸ за голову в год (корма). */
  yearlyFeedCost: number;
  /** ₸ за голову (ветеринария). */
  yearlyVetCost: number;
  /** Прочие расходы на голову, ₸. */
  yearlyOther: number;
  /** Га пастбищ на голову. */
  pastureHaPerHead: number;
  /** М² помещений на голову. */
  minBarnSqmPerHead: number;
}

export const FAJR_NORMS: Record<AnimalType, FajrNorm> = {
  KRS: {
    label: 'КРС (мясное/молочное)',
    cowShare: 0.5,             // доля коров (для расчёта молока)
    milkPerDay: 8,             // литров/день
    lactationDays: 305,        // дней лактации
    milkPricePerL: 90,         // ₸/литр
    avgWeightSale: 400,        // кг при реализации
    meatPricePerKg: 1500,      // ₸/кг
    saleShare: 0.15,           // годовая доля выбраковки/реализации
    yearlyFeedCost: 350000,    // ₸ за голову в год (упрощённо)
    yearlyVetCost: 3000,       // ₸ за голову
    yearlyOther: 100000,       // прочие расходы на голову
    pastureHaPerHead: 1.5,     // га пастбищ на голову
    minBarnSqmPerHead: 6       // м² помещений на голову
  },
  MRS: {
    label: 'МРС (овцы, козы)',
    cowShare: 0,
    milkPerDay: 0,
    lactationDays: 0,
    milkPricePerL: 0,
    avgWeightSale: 45,
    meatPricePerKg: 2200,
    saleShare: 0.25,
    yearlyFeedCost: 45000,
    yearlyVetCost: 800,
    yearlyOther: 15000,
    pastureHaPerHead: 0.3,
    minBarnSqmPerHead: 1.5
  },
  HORSE: {
    label: 'Лошади',
    cowShare: 0,
    milkPerDay: 0,
    lactationDays: 0,
    milkPricePerL: 0,
    avgWeightSale: 380,
    meatPricePerKg: 2500,
    saleShare: 0.12,
    yearlyFeedCost: 280000,
    yearlyVetCost: 4000,
    yearlyOther: 80000,
    pastureHaPerHead: 3,
    minBarnSqmPerHead: 8
  },
  CAMEL: {
    label: 'Верблюды',
    cowShare: 0,
    milkPerDay: 0,
    lactationDays: 0,
    milkPricePerL: 0,
    avgWeightSale: 450,
    meatPricePerKg: 2200,
    saleShare: 0.10,
    yearlyFeedCost: 220000,
    yearlyVetCost: 4500,
    yearlyOther: 90000,
    pastureHaPerHead: 5,
    minBarnSqmPerHead: 10
  }
};
