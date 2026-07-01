import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import { PROGRAMS } from '@/data/programs';
import type { Answers } from '@/data/questions';
import { calculateSchedule, effectiveMaxTerm, pickInitialTerm } from '@/lib/schedule';

const require = createRequire(import.meta.url);
const legacy = require('./fixtures/legacy.cjs');

const byId = Object.fromEntries(PROGRAMS.map((p) => [p.id, p]));

describe('A5 calculateSchedule — biannual (Кең дала 2)', () => {
  it('два платежа с датами 05 декабря / 05 марта', () => {
    const sch = calculateSchedule(byId.ken_dala_2, 300_000_000, 18);
    expect(sch.type).toBe('biannual');
    if (sch.type !== 'biannual') throw new Error('not biannual');
    expect(sch.payments.map((p) => p.label)).toEqual(['05 декабря', '05 марта']);
  });

  it('суммы платежей и проценты по формуле 8+3 мес (до тенге)', () => {
    const amount = 300_000_000;
    const sch = calculateSchedule(byId.ken_dala_2, amount, 18);
    if (sch.type !== 'biannual') throw new Error('not biannual');
    const r = 5 / 100 / 12;
    const half = amount / 2;
    const intDec = amount * r * 8;
    const intMar = half * r * 3;
    expect(sch.payments[0].amount).toBe(half + intDec);
    expect(sch.payments[0].interest).toBe(intDec);
    expect(sch.payments[1].amount).toBe(half + intMar);
    expect(sch.payments[1].interest).toBe(intMar);
    expect(sch.total).toBe(amount + intDec + intMar);
    expect(sch.overpay).toBe(intDec + intMar);
  });
});

describe('A5 calculateSchedule — annual (Игілік 6%)', () => {
  it('тело amount/years + проценты на остаток, 84 мес = 7 лет', () => {
    const amount = 300_000_000;
    const sch = calculateSchedule(byId.igilik_bereke, amount, 84);
    if (sch.type !== 'annual') throw new Error('not annual');
    expect(sch.years).toBe(7);
    const principal = amount / 7;
    // Первый год: проценты на полную сумму.
    expect(sch.yearly[0].interest).toBe(amount * 6 / 100);
    expect(sch.yearly[0].payment).toBe(principal + amount * 6 / 100);
    // Последний год: остаток = principal, проценты на него.
    // toBeCloseTo: легаси накапливает remaining вычитанием (float-погрешность в 15-м знаке).
    expect(sch.yearly[6].interest).toBeCloseTo(principal * 6 / 100, 4);
    // Тело каждый год одинаково.
    for (const y of sch.yearly) expect(y.principal).toBe(principal);
  });

  it('rate Игілік = 6%, maxTerm = 108', () => {
    expect(byId.igilik_bereke.rate).toBe(6);
    expect(byId.igilik_bereke.maxTerm).toBe(108);
  });
});

describe('A5 effectiveMaxTerm', () => {
  it('Агробизнес с целью working (ПОС) → 48 мес', () => {
    const ans: Answers = { purpose: 'working' };
    expect(effectiveMaxTerm(byId.agrobusiness, ans)).toBe(48);
  });

  it('Агробизнес с целью investments → 120 мес (10 лет, снижено с 144 в 2026-06)', () => {
    expect(effectiveMaxTerm(byId.agrobusiness, { purpose: 'investments' })).toBe(120);
  });

  it('Агробизнес 2.0 с целью working → 48 мес (по регламенту)', () => {
    expect(effectiveMaxTerm(byId.agrobusiness_2, { purpose: 'working' })).toBe(48);
  });

  it('без termByPurpose / без подходящей цели → общий maxTerm', () => {
    expect(effectiveMaxTerm(byId.ken_dala_2, { purpose: 'vprir' })).toBe(18);
    expect(effectiveMaxTerm(byId.agrobusiness, {})).toBe(120);
    // Іскер с целью livestock не имеет лимита → общий maxTerm 84.
    expect(effectiveMaxTerm(byId.isker, { purpose: 'livestock' })).toBe(84);
    // Іскер с целью micro → 60.
    expect(effectiveMaxTerm(byId.isker, { purpose: 'micro' })).toBe(60);
  });
});

describe('A5 pickInitialTerm', () => {
  it('берёт наибольший шаг ≤ maxT', () => {
    expect(pickInitialTerm(84)).toBe(84);
    expect(pickInitialTerm(60)).toBe(60);
    expect(pickInitialTerm(48)).toBe(48);
    expect(pickInitialTerm(50)).toBe(48);
    expect(pickInitialTerm(18)).toBe(12);
    expect(pickInitialTerm(8)).toBe(8); // меньше 12 → сам maxT
  });
});

describe('A5 golden — schedule/effectiveMaxTerm/pickInitialTerm = легаси', () => {
  it('calculateSchedule совпадает на сетке программа×сумма×срок (до тенге)', () => {
    const lByid = Object.fromEntries(legacy.PROGRAMS.map((p: { id: string }) => [p.id, p]));
    const amounts = [5_000_000, 20_000_000, 60_000_000, 300_000_000, 1_000_000_000];
    const terms = [12, 18, 24, 36, 48, 60, 84, 120, 144, 180];
    for (const p of PROGRAMS) {
      for (const a of amounts) {
        for (const t of terms) {
          const mine = calculateSchedule(p, a, t);
          const ref = legacy.calculateSchedule(lByid[p.id], a, t);
          expect(mine, `${p.id} a=${a} t=${t}`).toEqual(ref);
        }
      }
    }
  });

  it('effectiveMaxTerm совпадает по программам и целям', () => {
    const lByid = Object.fromEntries(legacy.PROGRAMS.map((p: { id: string }) => [p.id, p]));
    const purposes = ['vprir', 'livestock', 'feedlot', 'investments', 'working', 'micro', undefined];
    for (const p of PROGRAMS) {
      // Агробизнес: срок инвестиций сознательно снижен 144→120 (фидбэк владельца
      // 2026-06-29) — расхождение с легаси здесь ожидаемо, golden не применяется.
      if (p.id === 'agrobusiness') continue;
      for (const purpose of purposes) {
        const ans = purpose ? { purpose } : {};
        expect(effectiveMaxTerm(p, ans), `${p.id}/${purpose}`).toBe(
          legacy.effectiveMaxTerm(lByid[p.id], ans)
        );
      }
    }
  });

  it('pickInitialTerm совпадает', () => {
    for (let m = 1; m <= 200; m++) {
      expect(pickInitialTerm(m)).toBe(legacy.pickInitialTerm(m));
    }
  });
});
