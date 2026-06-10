import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import { PROGRAMS } from '@/data/programs';
import { calculateStress, type StressInput } from '@/lib/stress';

const require = createRequire(import.meta.url);
const legacy = require('./fixtures/legacy.cjs');

const igilik = PROGRAMS.find((p) => p.id === 'igilik_bereke')!;
const legacyIgilik = legacy.PROGRAMS.find((p: { id: string }) => p.id === 'igilik_bereke');

describe('A6 calculateStress — состав расчёта', () => {
  it('доход КРС = молоко + мясо + доп; расход × поголовье', () => {
    const calc = { amount: 300_000_000, term: 84 };
    const stress: StressInput = {
      animalType: 'KRS',
      existingHerd: 50,
      plannedHerd: 100,
      pasturesHa: 500,
      barnSqm: 1500,
      existingDebtsMonthly: 0,
      annualRevenue: 0
    };
    const r = calculateStress(igilik, calc, stress);
    const totalHerd = 150;
    // Молоко: round(150*0.5)=75 коров × 8 × 305 × 90
    const milk = 75 * 8 * 305 * 90;
    // Мясо: round(150*0.15)=23 × 400 × 1500
    const meat = Math.round(totalHerd * 0.15) * 400 * 1500;
    expect(r.totalHerd).toBe(totalHerd);
    expect(r.expectedIncome).toBe(milk + meat + 0);
    expect(r.yearlyCosts).toBe(totalHerd * (350000 + 3000 + 100000));
    expect(r.netIncome).toBe(r.expectedIncome - r.yearlyCosts);
    expect(r.animalLabel).toBe('КРС (мясное/молочное)');
  });

  it('пастбища: при нехватке вердикт «Недостаточно пастбищ»', () => {
    const r = calculateStress(igilik, { amount: 300_000_000, term: 84 }, {
      animalType: 'KRS', existingHerd: 0, plannedHerd: 200, pasturesHa: 10, barnSqm: 99999
    });
    expect(r.pastureOk).toBe(false);
    expect(r.pastureNeeded).toBe(200 * 1.5);
    expect(r.verdict.title).toBe('Недостаточно пастбищ');
    expect(r.verdict.level).toBe('warn');
  });

  it('помещения: пастбищ хватает, помещений нет → «Недостаточно помещений»', () => {
    const r = calculateStress(igilik, { amount: 300_000_000, term: 84 }, {
      animalType: 'KRS', existingHerd: 0, plannedHerd: 100, pasturesHa: 99999, barnSqm: 10
    });
    expect(r.pastureOk).toBe(true);
    expect(r.barnOk).toBe(false);
    expect(r.barnNeeded).toBe(100 * 6);
    expect(r.verdict.title).toBe('Недостаточно помещений');
  });

  it('ratio комфортный (<30%) при ресурсах в норме и высоком доходе', () => {
    // По нормативам Fajr чистый КРС убыточен (~200 тыс ₸ дохода против 453 тыс расходов
    // на голову) — без доп.дохода netIncome<=0 и ratio=999. Даём annualRevenue (млн ₸/год).
    const r = calculateStress(igilik, { amount: 10_000_000, term: 84 }, {
      animalType: 'KRS', existingHerd: 200, plannedHerd: 100, pasturesHa: 99999, barnSqm: 99999,
      annualRevenue: 200
    });
    expect(r.pastureOk).toBe(true);
    expect(r.barnOk).toBe(true);
    expect(r.ratio).toBeLessThan(30);
    expect(r.verdict.level).toBe('ok');
    expect(r.verdict.title).toBe('Платёж комфортный');
  });

  it('ratio тяжёлый (>50%) при большом займе и малом стаде', () => {
    const r = calculateStress(igilik, { amount: 5_000_000_000, term: 84 }, {
      animalType: 'KRS', existingHerd: 0, plannedHerd: 100, pasturesHa: 99999, barnSqm: 99999
    });
    expect(r.ratio).toBeGreaterThan(50);
    expect(r.verdict.level).toBe('bad');
    expect(r.verdict.title).toBe('Платёж может быть тяжёлым');
  });

  it('чистый доход ≤ 0 → ratio = 999', () => {
    const r = calculateStress(igilik, { amount: 300_000_000, term: 84 }, {
      animalType: 'KRS', existingHerd: 0, plannedHerd: 1, pasturesHa: 99999, barnSqm: 99999
    });
    expect(r.netIncome).toBeLessThanOrEqual(0);
    expect(r.ratio).toBe(999);
  });

  it('текущие долги: existingDebtsMonthly (тыс/мес) и annualRevenue (млн/год) масштабируются', () => {
    const r = calculateStress(igilik, { amount: 300_000_000, term: 84 }, {
      animalType: 'KRS', existingHerd: 50, plannedHerd: 100, pasturesHa: 99999, barnSqm: 99999,
      existingDebtsMonthly: 150, annualRevenue: 15
    });
    expect(r.existingDebtsYearly).toBe(150 * 1000 * 12);
    // annualRevenue добавлен к доходу (15 млн).
    const without = calculateStress(igilik, { amount: 300_000_000, term: 84 }, {
      animalType: 'KRS', existingHerd: 50, plannedHerd: 100, pasturesHa: 99999, barnSqm: 99999
    });
    expect(r.expectedIncome - without.expectedIncome).toBe(15 * 1e6);
  });
});

describe('A6 golden — calculateStress = легаси (по всем видам и тирам)', () => {
  const inputs: StressInput[] = [
    { animalType: 'KRS', existingHerd: 50, plannedHerd: 100, pasturesHa: 500, barnSqm: 1500 },
    { animalType: 'KRS', existingHerd: 0, plannedHerd: 200, pasturesHa: 10, barnSqm: 10 },
    { animalType: 'KRS', existingHerd: 200, plannedHerd: 100, pasturesHa: 99999, barnSqm: 99999, existingDebtsMonthly: 150, annualRevenue: 15 },
    { animalType: 'MRS', existingHerd: 100, plannedHerd: 500, pasturesHa: 300, barnSqm: 1200 },
    { animalType: 'HORSE', existingHerd: 20, plannedHerd: 80, pasturesHa: 400, barnSqm: 900 },
    { animalType: 'CAMEL', existingHerd: 10, plannedHerd: 40, pasturesHa: 300, barnSqm: 600 },
    { animalType: 'KRS', existingHerd: 0, plannedHerd: 1, pasturesHa: 99999, barnSqm: 99999 },
    {} // дефолты: КРС, нули
  ];
  const calcs = [
    { amount: 10_000_000, term: 84 },
    { amount: 300_000_000, term: 60 },
    { amount: 5_000_000_000, term: 84 }
  ];

  it('полный объект результата совпадает (включая текст вердикта)', () => {
    for (const calc of calcs) {
      for (const inp of inputs) {
        const mine = calculateStress(igilik, calc, inp);
        const ref = legacy.calculateStress(legacyIgilik, calc, inp);
        expect(mine, JSON.stringify({ calc, inp })).toEqual(ref);
      }
    }
  });
});
