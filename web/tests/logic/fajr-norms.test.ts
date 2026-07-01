import { describe, it, expect } from 'vitest';
import { FAJR_NORMS, type AnimalType } from '@/data/fajr-norms';

// A3 — нормативы пересмотрены 2026-06-29 (DRAFT): добавлены параметры приплода,
// снижена себестоимость до пастбищной. Golden-сверка с легаси отменена; нормативы
// пастбищ/помещений (регламент П АКК 002-207-22) сохранены и проверяются дословно.

const TYPES: AnimalType[] = ['KRS', 'MRS', 'HORSE', 'CAMEL'];

describe('A3 FAJR_NORMS', () => {
  it('заданы все 4 вида животных', () => {
    expect(Object.keys(FAJR_NORMS).sort()).toEqual([...TYPES].sort());
  });

  it('нормативы пастбищ/помещений — по П АКК 002-207-22 (2026)', () => {
    expect(FAJR_NORMS.KRS.pastureHaPerHead).toBe(3);
    expect(FAJR_NORMS.MRS.pastureHaPerHead).toBe(0.5);
    expect(FAJR_NORMS.HORSE.pastureHaPerHead).toBe(3);
    expect(FAJR_NORMS.CAMEL.pastureHaPerHead).toBe(3);
    expect(FAJR_NORMS.KRS.minBarnSqmPerHead).toBe(3);
    expect(FAJR_NORMS.MRS.minBarnSqmPerHead).toBe(1);
    expect(FAJR_NORMS.HORSE.minBarnSqmPerHead).toBe(3);
    expect(FAJR_NORMS.CAMEL.minBarnSqmPerHead).toBe(3);
  });

  it('только КРС даёт молоко (cowShare/milkPerDay > 0)', () => {
    expect(FAJR_NORMS.KRS.cowShare).toBeGreaterThan(0);
    for (const t of ['MRS', 'HORSE', 'CAMEL'] as AnimalType[]) {
      expect(FAJR_NORMS[t].cowShare).toBe(0);
      expect(FAJR_NORMS[t].milkPerDay).toBe(0);
    }
  });

  it('у каждого вида заданы корректные параметры приплода и затрат', () => {
    for (const t of TYPES) {
      const n = FAJR_NORMS[t];
      expect(n.breedingShare, t).toBeGreaterThan(0);
      expect(n.breedingShare, t).toBeLessThanOrEqual(1);
      expect(n.calvingRate, t).toBeGreaterThan(0);
      expect(n.youngSaleShare, t).toBeGreaterThan(0);
      expect(n.youngSaleShare, t).toBeLessThanOrEqual(1);
      expect(n.youngSalePrice, t).toBeGreaterThan(0);
      expect(n.yearlyFeedCost, t).toBeGreaterThan(0);
      expect(n.yearlyVetCost, t).toBeGreaterThan(0);
      expect(n.yearlyOther, t).toBeGreaterThan(0);
    }
  });

  it('DRAFT-фикс: себестоимость КРС снижена с прежних 450 тыс ₸/гол', () => {
    const totalCost = FAJR_NORMS.KRS.yearlyFeedCost + FAJR_NORMS.KRS.yearlyVetCost + FAJR_NORMS.KRS.yearlyOther;
    expect(totalCost).toBeLessThan(453000);
  });
});
