// =====================================================
// ===== A3: FAJR_NORMS (упрощённые из FAJROptions) ====
// Базис перенесён из index.html (≈ строки 2751–2811, модель Fajr).
//
// ⚠️ DRAFT 2026-06-29 (фидбэк владельца «нормативы пересмотреть»):
// прежняя модель учитывала доход только как выбраковку (saleShare) + молоко,
// а себестоимость брала на уровне откорма (≈450 тыс ₸/гол) — из-за чего ЛЮБОЕ
// стадо без стороннего дохода давало отрицательный чистый доход (ratio 999%).
// Добавлены параметры приплода (breedingShare/calvingRate/youngSaleShare/
// youngSalePrice) и снижена себестоимость до уровня пастбищного содержания.
// ВСЕ значения дохода/затрат/приплода — ЧЕРНОВЫЕ, требуют сверки с бизнесом
// (Марат / зоотехник). Нормативы пастбищ/помещений (pastureHaPerHead,
// minBarnSqmPerHead) сверены с регламентом П АКК 002-207-22 (2026): КРС 3 га / 3 м²,
// МРС 0,5 га / 1 м², лошади 3 га / 3 м², верблюды 3 га / 3 м² (прежние значения были
// оценочными и не совпадали с регламентом).
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
  /** Годовая доля выбраковки/реализации взрослого поголовья. */
  saleShare: number;
  // --- Приплод (DRAFT, сверить с бизнесом) ---
  /** Доля маток в стаде. */
  breedingShare: number;
  /** Выход приплода на одну матку в год. */
  calvingRate: number;
  /** Доля приплода, идущая на реализацию (остальное — ремонт/рост стада). */
  youngSaleShare: number;
  /** Цена реализации одной головы молодняка, ₸. */
  youngSalePrice: number;
  // --- Затраты (DRAFT, пастбищное содержание) ---
  /** ₸ за голову в год (корма). */
  yearlyFeedCost: number;
  /** ₸ за голову (ветеринария). */
  yearlyVetCost: number;
  /** Прочие расходы на голову, ₸. */
  yearlyOther: number;
  /** Га пастбищ на голову (регламент — не менять). */
  pastureHaPerHead: number;
  /** М² помещений на голову (регламент — не менять). */
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
    breedingShare: 0.45,       // DRAFT: доля маток
    calvingRate: 0.8,          // DRAFT: телят на матку в год
    youngSaleShare: 0.6,       // DRAFT: доля приплода на продажу
    youngSalePrice: 280000,    // DRAFT: ₸ за голову молодняка
    yearlyFeedCost: 110000,    // DRAFT: корма (пастбищное содержание)
    yearlyVetCost: 3000,       // DRAFT: ветеринария
    yearlyOther: 25000,        // DRAFT: прочие расходы
    pastureHaPerHead: 3,       // га пастбищ на голову (П АКК 002-207-22: ≥3 га в пастбищный период)
    minBarnSqmPerHead: 3       // м² помещений на голову (навес 3 м²/гол; выгул — доп. 15 м²/гол)
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
    breedingShare: 0.7,        // DRAFT
    calvingRate: 1.0,          // DRAFT
    youngSaleShare: 0.7,       // DRAFT
    youngSalePrice: 45000,     // DRAFT
    yearlyFeedCost: 18000,     // DRAFT
    yearlyVetCost: 800,        // DRAFT
    yearlyOther: 6000,         // DRAFT
    pastureHaPerHead: 0.5,     // П АКК 002-207-22: ≥0,5 га на голову
    minBarnSqmPerHead: 1       // 1 м²/гол (откорм — 2 м²/гол)
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
    breedingShare: 0.5,        // DRAFT
    calvingRate: 0.5,          // DRAFT
    youngSaleShare: 0.6,       // DRAFT
    youngSalePrice: 250000,    // DRAFT
    yearlyFeedCost: 90000,     // DRAFT
    yearlyVetCost: 4000,       // DRAFT
    yearlyOther: 22000,        // DRAFT
    pastureHaPerHead: 3,       // совпадает с регламентом
    minBarnSqmPerHead: 3       // П АКК 002-207-22: 3 м²/гол
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
    breedingShare: 0.5,        // DRAFT
    calvingRate: 0.4,          // DRAFT
    youngSaleShare: 0.5,       // DRAFT
    youngSalePrice: 300000,    // DRAFT
    yearlyFeedCost: 80000,     // DRAFT
    yearlyVetCost: 4500,       // DRAFT
    yearlyOther: 25000,        // DRAFT
    pastureHaPerHead: 3,       // П АКК 002-207-22: 3 га/гол
    minBarnSqmPerHead: 3       // 3 м²/гол
  }
};
