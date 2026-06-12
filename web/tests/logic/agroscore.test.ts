import { describe, it, expect } from 'vitest';
import { AGRO_PERSONAS } from '@/data/agroscore-personas';
import { calculateAgroScore } from '@/lib/agroscore';
import type { AgroPersona } from '@/data/agroscore-personas';

const [persona1, persona2, persona3] = AGRO_PERSONAS;

describe('G16 AgroScore — bands per persona', () => {
  it('persona1 (Айбек Сейтов) → band A', () => {
    const result = calculateAgroScore(persona1);
    expect(result.band).toBe('A');
  });

  it('persona2 (Гүлнар Бекова) → band B or C, isThinFile=true', () => {
    const result = calculateAgroScore(persona2);
    expect(['B', 'C']).toContain(result.band);
    expect(result.isThinFile).toBe(true);
  });

  it('persona3 (Марат Джаксыбеков) → band D', () => {
    const result = calculateAgroScore(persona3);
    expect(result.band).toBe('D');
  });
});

describe('G16 AgroScore — factor weights', () => {
  it('sum of all factor weights === 1.0', () => {
    const result = calculateAgroScore(persona1);
    const total = result.factors.reduce((s, f) => s + f.weight, 0);
    expect(total).toBeCloseTo(1.0, 10);
  });
});

describe('G16 AgroScore — monotonicity', () => {
  it('had_default=true scores lower discipline bucket than without default', () => {
    const withDefault: AgroPersona = {
      ...persona1,
      creditBureau: { ...persona1.creditBureau, had_default: true },
    };
    const withoutDefault: AgroPersona = {
      ...persona1,
      creditBureau: { ...persona1.creditBureau, had_default: false },
    };
    const resWith = calculateAgroScore(withDefault);
    const resWithout = calculateAgroScore(withoutDefault);
    const disciplineWith = resWith.factors.find((f) => f.key === 'discipline')!.contribution;
    const disciplineWithout = resWithout.factors.find((f) => f.key === 'discipline')!.contribution;
    expect(disciplineWith).toBeLessThan(disciplineWithout);
  });
});

describe('G16 AgroScore — thin file', () => {
  it('persona2 isThinFile === true (no AKK history)', () => {
    const result = calculateAgroScore(persona2);
    expect(result.isThinFile).toBe(true);
  });

  it('persona1 isThinFile === false (has AKK history)', () => {
    const result = calculateAgroScore(persona1);
    expect(result.isThinFile).toBe(false);
  });
});

describe('G16 AgroScore — determinism', () => {
  it('calling calculateAgroScore twice gives same result', () => {
    const r1 = calculateAgroScore(persona1);
    const r2 = calculateAgroScore(persona1);
    expect(r1).toEqual(r2);
  });

  it('all personas are deterministic', () => {
    for (const p of AGRO_PERSONAS) {
      expect(calculateAgroScore(p)).toEqual(calculateAgroScore(p));
    }
  });
});

describe('G16 AgroScore — preApproved', () => {
  it('preApproved is null for band D (persona3)', () => {
    const result = calculateAgroScore(persona3);
    expect(result.preApproved).toBeNull();
  });

  it('preApproved is non-null for band A (persona1)', () => {
    const result = calculateAgroScore(persona1);
    expect(result.preApproved).not.toBeNull();
    expect(result.preApproved?.limit_tg).toBe(50_000_000);
    expect(result.preApproved?.rate_pct).toBe(5.5);
  });
});

describe('G16 AgroScore — trendPoints', () => {
  it('trendPoints has 5 points, all in [0, 100]', () => {
    for (const p of AGRO_PERSONAS) {
      const result = calculateAgroScore(p);
      expect(result.trendPoints).toHaveLength(5);
      for (const pt of result.trendPoints) {
        expect(pt).toBeGreaterThanOrEqual(0);
        expect(pt).toBeLessThanOrEqual(100);
      }
    }
  });

  it('last trendPoint equals the computed score', () => {
    const result = calculateAgroScore(persona1);
    expect(result.trendPoints[4]).toBe(result.score);
  });
});
