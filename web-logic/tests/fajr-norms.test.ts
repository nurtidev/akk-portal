import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import { FAJR_NORMS, type AnimalType } from '../src/data/fajr-norms';

const require = createRequire(import.meta.url);
const legacy = require('./fixtures/legacy.cjs');

const TYPES: AnimalType[] = ['KRS', 'MRS', 'HORSE', 'CAMEL'];

describe('A3 FAJR_NORMS', () => {
  it('заданы все 4 вида животных', () => {
    expect(Object.keys(FAJR_NORMS).sort()).toEqual([...TYPES].sort());
  });

  it('коэффициенты КРС дословны', () => {
    expect(FAJR_NORMS.KRS).toEqual({
      label: 'КРС (мясное/молочное)',
      cowShare: 0.5,
      milkPerDay: 8,
      lactationDays: 305,
      milkPricePerL: 90,
      avgWeightSale: 400,
      meatPricePerKg: 1500,
      saleShare: 0.15,
      yearlyFeedCost: 350000,
      yearlyVetCost: 3000,
      yearlyOther: 100000,
      pastureHaPerHead: 1.5,
      minBarnSqmPerHead: 6
    });
  });

  it('пастбищный норматив растёт по видам (КРС 1.5 < лошади 3 < верблюды 5)', () => {
    expect(FAJR_NORMS.KRS.pastureHaPerHead).toBe(1.5);
    expect(FAJR_NORMS.MRS.pastureHaPerHead).toBe(0.3);
    expect(FAJR_NORMS.HORSE.pastureHaPerHead).toBe(3);
    expect(FAJR_NORMS.CAMEL.pastureHaPerHead).toBe(5);
  });

  it('только КРС даёт молоко (cowShare/milkPerDay > 0)', () => {
    expect(FAJR_NORMS.KRS.cowShare).toBeGreaterThan(0);
    for (const t of ['MRS', 'HORSE', 'CAMEL'] as AnimalType[]) {
      expect(FAJR_NORMS[t].cowShare).toBe(0);
      expect(FAJR_NORMS[t].milkPerDay).toBe(0);
    }
  });

  it('golden — каждое поле совпадает с легаси-фикстурой', () => {
    for (const t of TYPES) {
      expect(FAJR_NORMS[t]).toEqual(legacy.FAJR_NORMS[t]);
    }
  });
});
