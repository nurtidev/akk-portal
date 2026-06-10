import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import { PROGRAMS } from '../src/data/programs';
import { fmtAmount, fmtRate, declension } from '../src/lib/format';

const require = createRequire(import.meta.url);
const legacy = require('./fixtures/legacy.cjs');

const byId = Object.fromEntries(PROGRAMS.map((p) => [p.id, p]));

describe('A7 fmtAmount', () => {
  it('укрупняет по порогам', () => {
    expect(fmtAmount(1_500_000_000)).toBe('1,5 млрд ₸');
    expect(fmtAmount(300_000_000)).toBe('300 млн ₸');
    expect(fmtAmount(34_600_000)).toBe('35 млн ₸');
    expect(fmtAmount(150_000)).toBe('150 тыс ₸');
    expect(fmtAmount(500)).toBe('500 ₸');
  });

  it('golden = легаси на сетке сумм', () => {
    const grid = [0, 500, 999, 1000, 150_000, 999_999, 1_000_000, 34_600_000, 300_000_000, 1_500_000_000, 15_000_000_000];
    for (const v of grid) {
      expect(fmtAmount(v), String(v)).toBe(legacy.fmtAmount(v));
    }
  });
});

describe('A7 declension', () => {
  it('год / года / лет', () => {
    expect(declension(1, 'год', 'года', 'лет')).toBe('год');
    expect(declension(2, 'год', 'года', 'лет')).toBe('года');
    expect(declension(5, 'год', 'года', 'лет')).toBe('лет');
    expect(declension(11, 'год', 'года', 'лет')).toBe('лет');
    expect(declension(21, 'год', 'года', 'лет')).toBe('год');
  });

  it('golden = легаси для n = 0..120', () => {
    for (let n = 0; n <= 120; n++) {
      expect(declension(n, 'год', 'года', 'лет'), String(n)).toBe(
        legacy.declension(n, 'год', 'года', 'лет')
      );
    }
  });
});

describe('A7 fmtRate (чистая версия — структура, не HTML)', () => {
  it('без диапазона → «от {rate}%», запятая-разделитель', () => {
    expect(fmtRate(byId.ken_dala_2)).toEqual({ text: 'от 5%', hasRange: false });
    expect(fmtRate(byId.ken_dala)).toEqual({ text: 'от 1,5%', hasRange: false });
    expect(fmtRate(byId.agrobusiness_2)).toEqual({ text: 'от 12,6%', hasRange: false });
  });

  it('с диапазоном (Агробизнес) → «≈ {rate}%» + тултип', () => {
    const r = fmtRate(byId.agrobusiness);
    expect(r.text).toBe('≈ 21,5%');
    expect(r.hasRange).toBe(true);
    expect(r.tip).toBe(byId.agrobusiness.rateTip); // rateTip приоритетнее rateRange
  });

  it('tip = rateRange, если rateTip не задан', () => {
    const r = fmtRate({ rate: 7, rateRange: '7–10%' });
    expect(r.text).toBe('≈ 7%');
    expect(r.tip).toBe('7–10%');
  });
});
