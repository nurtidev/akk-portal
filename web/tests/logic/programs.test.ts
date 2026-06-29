import { describe, it, expect } from 'vitest';
import { PROGRAMS, PROGRAM_DETAILS } from '@/data/programs';

describe('A1 PROGRAMS', () => {
  it('содержит ровно 7 программ', () => {
    expect(PROGRAMS).toHaveLength(7);
  });

  it('id программ совпадают с легаси (порядок сохранён)', () => {
    expect(PROGRAMS.map((p) => p.id)).toEqual([
      'ken_dala',
      'ken_dala_2',
      'agrobusiness',
      'igilik_bereke',
      'isker',
      'feedlot_poultry',
      'agrobusiness_2'
    ]);
  });

  it('Кең дала — indirectOnly и hidden, отсекается hard-правилом __never__', () => {
    const p = PROGRAMS.find((x) => x.id === 'ken_dala')!;
    expect(p.indirectOnly).toBe(true);
    expect(p.hidden).toBe(true);
    expect(p.hard).toEqual([{ q: 'purpose', v: ['__never__'] }]);
  });

  it('ключевые числовые параметры (rate/maxAmount/maxTerm) дословны', () => {
    const byId = Object.fromEntries(PROGRAMS.map((p) => [p.id, p]));
    expect(byId.ken_dala_2.rate).toBe(5);
    expect(byId.ken_dala_2.maxAmount).toBe(1500000000);
    expect(byId.ken_dala_2.maxTerm).toBe(18);
    expect(byId.ken_dala_2.scheduleType).toBe('biannual_winter');
    expect(byId.ken_dala_2.featured).toBe(true);

    expect(byId.agrobusiness.rate).toBe(21.5);
    expect(byId.agrobusiness.rateRange).toBe('НБРК+7,5%');
    // Срок инвестиций снижен 144→120 мес (10 лет) по фидбэку владельца 2026-06-29.
    expect(byId.agrobusiness.maxTerm).toBe(120);
    expect(byId.agrobusiness.termByPurpose).toEqual({ investments: 120, working: 48 });

    expect(byId.igilik_bereke.rate).toBe(6);
    expect(byId.igilik_bereke.maxTerm).toBe(84);
    expect(byId.igilik_bereke.hasStressTest).toBe(true);

    expect(byId.isker.maxAmount).toBe(34600000);
    expect(byId.isker.termByPurpose).toEqual({ vprir: 60, feedlot: 60, investments: 60, working: 60, micro: 60 });

    expect(byId.agrobusiness_2.rate).toBe(12.6);
    expect(byId.agrobusiness_2.maxTerm).toBe(180);
    expect(byId.agrobusiness_2.termByPurpose).toEqual({ investments: 180, working: 12 });
  });

  it('rateRange задан только у Агробизнеса (не схлопывать rate/rateRange)', () => {
    const withRange = PROGRAMS.filter((p) => p.rateRange);
    expect(withRange.map((p) => p.id)).toEqual(['agrobusiness']);
  });

  it('hasStressTest только у Игілік/Береке', () => {
    expect(PROGRAMS.filter((p) => p.hasStressTest).map((p) => p.id)).toEqual(['igilik_bereke']);
  });
});

describe('A1 PROGRAM_DETAILS', () => {
  it('есть детали для всех 6 видимых программ (кроме ken_dala)', () => {
    expect(Object.keys(PROGRAM_DETAILS).sort()).toEqual(
      ['agrobusiness', 'agrobusiness_2', 'feedlot_poultry', 'igilik_bereke', 'isker', 'ken_dala_2'].sort()
    );
  });

  it('каждая деталь имеет summary/spend/requirements/repayment/note', () => {
    for (const detail of Object.values(PROGRAM_DETAILS)) {
      expect(typeof detail.summary).toBe('string');
      expect(Array.isArray(detail.spend)).toBe(true);
      expect(detail.spend.length).toBeGreaterThan(0);
      expect(Array.isArray(detail.requirements)).toBe(true);
      expect(typeof detail.repayment).toBe('string');
      expect(typeof detail.note).toBe('string');
    }
  });
});
