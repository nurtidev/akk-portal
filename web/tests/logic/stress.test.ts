import { describe, it, expect } from 'vitest';
import { PROGRAMS } from '@/data/programs';
import { FAJR_NORMS } from '@/data/fajr-norms';
import { calculateStress, type StressInput } from '@/lib/stress';
import { calculateSchedule, type AnnualSchedule } from '@/lib/schedule';

// A6 — модель стресс-теста переработана 2026-06-29 (фидбэк владельца): добавлен
// доход от приплода, себестоимость снижена до пастбищной, платёж — среднегодовой.
// Прежняя golden-сверка с легаси отменена (сознательный отход). Коэффициенты —
// DRAFT (см. FAJR_NORMS), поэтому тесты проверяют СТРУКТУРУ и инварианты, а не
// конкретные «магические» суммы.

const igilik = PROGRAMS.find((p) => p.id === 'igilik_bereke')!;
const K = FAJR_NORMS.KRS;

describe('A6 calculateStress — состав расчёта', () => {
  it('доход КРС = приплод + молоко + мясо + доп; расход × поголовье', () => {
    const calc = { amount: 300_000_000, term: 84 };
    const stress: StressInput = {
      animalType: 'KRS', existingHerd: 50, plannedHerd: 100,
      pasturesHa: 500, barnSqm: 1500, existingDebtsMonthly: 0, annualRevenue: 0,
    };
    const r = calculateStress(igilik, calc, stress);
    const totalHerd = 150;
    const breedingStock = Math.round(totalHerd * K.breedingShare);
    const young = Math.round(breedingStock * K.calvingRate * K.youngSaleShare) * K.youngSalePrice;
    const milk = Math.round(totalHerd * K.cowShare) * K.milkPerDay * K.lactationDays * K.milkPricePerL;
    const meat = Math.round(totalHerd * K.saleShare) * K.avgWeightSale * K.meatPricePerKg;
    expect(r.totalHerd).toBe(totalHerd);
    expect(r.expectedIncome).toBe(young + milk + meat + 0);
    expect(r.yearlyCosts).toBe(totalHerd * (K.yearlyFeedCost + K.yearlyVetCost + K.yearlyOther));
    expect(r.netIncome).toBe(r.expectedIncome - r.yearlyCosts);
    expect(r.animalLabel).toBe('КРС (мясное/молочное)');
  });

  it('ФИКС: нормальное стадо КРС даёт ПОЛОЖИТЕЛЬНЫЙ чистый доход (раньше было 999)', () => {
    const r = calculateStress(igilik, { amount: 50_000_000, term: 84 }, {
      animalType: 'KRS', existingHerd: 0, plannedHerd: 100, pasturesHa: 99999, barnSqm: 99999,
    });
    expect(r.netIncome).toBeGreaterThan(0);
    expect(r.ratio).toBeLessThan(999);
  });

  it('платёж — среднегодовой по графику (avgPayment), а не пиковый 1-й год', () => {
    const calc = { amount: 300_000_000, term: 84 };
    const sch = calculateSchedule(igilik, calc.amount, calc.term) as AnnualSchedule;
    const r = calculateStress(igilik, calc, {
      animalType: 'KRS', existingHerd: 50, plannedHerd: 100, pasturesHa: 99999, barnSqm: 99999,
    });
    expect(r.yearlyPayment).toBe(sch.avgPayment);
    expect(sch.avgPayment).toBeLessThan(sch.firstYearPayment); // средний ниже пикового
  });

  it('пастбища: при нехватке — «Недостаточно пастбищ», без слова «менеджер»', () => {
    const r = calculateStress(igilik, { amount: 300_000_000, term: 84 }, {
      animalType: 'KRS', existingHerd: 0, plannedHerd: 200, pasturesHa: 10, barnSqm: 99999,
    });
    expect(r.pastureOk).toBe(false);
    expect(r.pastureNeeded).toBe(200 * K.pastureHaPerHead);
    expect(r.verdict.title).toBe('Недостаточно пастбищ');
    expect(r.verdict.level).toBe('warn');
    expect(r.verdict.text).not.toMatch(/менеджер/i);
  });

  it('помещения: пастбищ хватает, помещений нет → «Недостаточно помещений», без «менеджер»', () => {
    const r = calculateStress(igilik, { amount: 300_000_000, term: 84 }, {
      animalType: 'KRS', existingHerd: 0, plannedHerd: 100, pasturesHa: 99999, barnSqm: 10,
    });
    expect(r.pastureOk).toBe(true);
    expect(r.barnOk).toBe(false);
    expect(r.barnNeeded).toBe(100 * K.minBarnSqmPerHead);
    expect(r.verdict.title).toBe('Недостаточно помещений');
    expect(r.verdict.text).not.toMatch(/менеджер/i);
  });

  it('комфортный платёж (<60%) при ресурсах в норме и высоком доходе', () => {
    const r = calculateStress(igilik, { amount: 10_000_000, term: 84 }, {
      animalType: 'KRS', existingHerd: 200, plannedHerd: 100, pasturesHa: 99999, barnSqm: 99999,
      annualRevenue: 200,
    });
    expect(r.ratio).toBeLessThan(60);
    expect(r.verdict.level).toBe('ok');
    expect(r.verdict.title).toBe('Платёж комфортный');
  });

  it('тяжёлый платёж (≥100%) при огромном займе и малом стаде', () => {
    const r = calculateStress(igilik, { amount: 5_000_000_000, term: 84 }, {
      animalType: 'KRS', existingHerd: 0, plannedHerd: 100, pasturesHa: 99999, barnSqm: 99999,
    });
    expect(r.ratio).toBeGreaterThanOrEqual(100);
    expect(r.verdict.level).toBe('bad');
    expect(r.verdict.title).toBe('Платёж может быть тяжёлым');
  });

  it('ни один вердикт не упоминает «менеджер»', () => {
    const cases: StressInput[] = [
      { animalType: 'KRS', existingHerd: 0, plannedHerd: 200, pasturesHa: 1, barnSqm: 1 },
      { animalType: 'KRS', existingHerd: 0, plannedHerd: 100, pasturesHa: 99999, barnSqm: 1 },
      { animalType: 'KRS', existingHerd: 200, plannedHerd: 100, pasturesHa: 99999, barnSqm: 99999, annualRevenue: 200 },
      { animalType: 'KRS', existingHerd: 0, plannedHerd: 100, pasturesHa: 99999, barnSqm: 99999 },
      { animalType: 'MRS', existingHerd: 100, plannedHerd: 500, pasturesHa: 99999, barnSqm: 99999 },
    ];
    for (const c of cases) {
      const r = calculateStress(igilik, { amount: 5_000_000_000, term: 84 }, c);
      expect(r.verdict.text, JSON.stringify(c)).not.toMatch(/менеджер/i);
    }
  });

  it('текущие долги (тыс/мес ×1000×12) и доп.доход (млн/год ×1e6) масштабируются', () => {
    const base: StressInput = {
      animalType: 'KRS', existingHerd: 50, plannedHerd: 100, pasturesHa: 99999, barnSqm: 99999,
    };
    const r = calculateStress(igilik, { amount: 300_000_000, term: 84 }, {
      ...base, existingDebtsMonthly: 150, annualRevenue: 15,
    });
    const without = calculateStress(igilik, { amount: 300_000_000, term: 84 }, base);
    expect(r.existingDebtsYearly).toBe(150 * 1000 * 12);
    expect(r.expectedIncome - without.expectedIncome).toBe(15 * 1e6);
  });
});
