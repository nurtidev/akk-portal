import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import { PROGRAMS } from '@/data/programs';
import type { Answers } from '@/data/questions';
import { scoreProgram, explainProgram, scoredPrograms } from '@/lib/scoring';

const require = createRequire(import.meta.url);
const legacy = require('./fixtures/legacy.cjs');

// 7 сквозных сценариев из tests/onboarding.spec.js (ответы квиза с учётом авто-sector).
const SCENARIOS: { name: string; answers: Answers; topId: string; topScore: number }[] = [
  {
    name: 'ВПРиУР → растениеводство(авто) → 3+ → 100–500 млн',
    answers: { purpose: 'vprir', sector: 'plant', experience: '3plus', amount: '100-500m' },
    topId: 'ken_dala_2',
    topScore: 100
  },
  {
    name: 'Импортный скот КРС 100–499 → 3+ → 100–500 млн',
    answers: { purpose: 'livestock', sector: 'animal', experience: '3plus', amount: '100-500m', animalType: 'KRS', cattleOrigin: 'imported', heads: '100-499' },
    topId: 'igilik_bereke',
    topScore: 100
  },
  {
    name: 'Импортный скот КРС 500+ → 3+ → 500+ млн',
    answers: { purpose: 'livestock', sector: 'animal', experience: '3plus', amount: '500m-plus', animalType: 'KRS', cattleOrigin: 'imported', heads: '500plus' },
    topId: 'igilik_bereke',
    topScore: 100
  },
  {
    name: 'Отечественный скот КРS → Игілік отсекается, fallback Агробизнес',
    answers: { purpose: 'livestock', sector: 'animal', experience: '3plus', amount: '100-500m', animalType: 'KRS', cattleOrigin: 'domestic', heads: '100-499' },
    topId: 'agrobusiness',
    topScore: 80
  },
  {
    name: 'Микрокредит → услуги → стартап → село → до 20 млн',
    answers: { purpose: 'micro', sector: 'services', experience: 'startup', location: 'village', amount: 'under-20m' },
    topId: 'isker',
    topScore: 100
  },
  {
    name: 'Откорм → птицеводство(авто) → 3+ → малый город → 100–500 млн',
    answers: { purpose: 'feedlot', sector: 'poultry', experience: '3plus', location: 'small-town', amount: '100-500m' },
    topId: 'feedlot_poultry',
    topScore: 95
  },
  {
    name: 'Инвестиции → переработка → 3+ → 500+ млн (топ — Агробизнес 2.0)',
    answers: { purpose: 'investments', sector: 'processing', experience: '3plus', amount: '500m-plus' },
    topId: 'agrobusiness_2',
    topScore: 100
  }
];

describe('A4 scoring — 7 сквозных сценариев', () => {
  for (const sc of SCENARIOS) {
    it(sc.name, () => {
      const ranked = scoredPrograms(sc.answers);
      expect(ranked.length, 'есть хотя бы одна программа').toBeGreaterThan(0);
      expect(ranked[0].program.id).toBe(sc.topId);
      expect(ranked[0].score).toBe(sc.topScore);
    });
  }

  it('Игілік отсекается при отечественном скоте и при не-КРС', () => {
    const domestic: Answers = { purpose: 'livestock', sector: 'animal', experience: '3plus', amount: '100-500m', animalType: 'KRS', cattleOrigin: 'domestic', heads: '100-499' };
    const horse: Answers = { purpose: 'livestock', sector: 'animal', experience: '3plus', amount: '100-500m', animalType: 'HORSE', heads: '100-499' };
    const igilik = PROGRAMS.find((p) => p.id === 'igilik_bereke')!;
    expect(scoreProgram(igilik, domestic)).toBeNull();
    expect(scoreProgram(igilik, horse)).toBeNull();
    // Лошади → Агробизнес присутствует в выдаче.
    expect(scoredPrograms(horse).some((x) => x.program.id === 'agrobusiness')).toBe(true);
  });
});

describe('A4 explainProgram — структура разбора', () => {
  it('score = min(100, Σw); rawScore не зажат', () => {
    const igilik = PROGRAMS.find((p) => p.id === 'igilik_bereke')!;
    const ans: Answers = { purpose: 'livestock', sector: 'animal', experience: '3plus', amount: '100-500m', animalType: 'KRS', cattleOrigin: 'imported', heads: '100-499' };
    const ex = explainProgram(igilik, ans);
    expect(ex.passedHard).toBe(true);
    expect(ex.rawScore).toBe(105); // 50 + 35 + 20
    expect(ex.score).toBe(100);
  });

  it('недобор по опыту: w < maxW, bestLabel подсказывает «Более 3 лет»', () => {
    const kd2 = PROGRAMS.find((p) => p.id === 'ken_dala_2')!;
    const ans: Answers = { purpose: 'vprir', sector: 'plant', experience: '1-3', amount: '100-500m' };
    const ex = explainProgram(kd2, ans);
    expect(ex.score).toBe(80); // 20(опыт) + 25(растениеводство) + 35(сумма)
    const exp = ex.softFactors.find((f) => f.q === 'experience')!;
    expect(exp.w).toBe(20);
    expect(exp.maxW).toBe(40);
    expect(exp.label).toBe('1 – 3 года');
    expect(exp.bestLabel).toBe('Более 3 лет');
  });

  it('не заданный вопрос (animalType вне покупки скота) пропускается в softFactors', () => {
    const isker = PROGRAMS.find((p) => p.id === 'isker')!;
    const ans: Answers = { purpose: 'micro', sector: 'services', experience: 'startup', location: 'village', amount: 'under-20m' };
    const ex = explainProgram(isker, ans);
    expect(ex.softFactors.some((f) => f.q === 'animalType')).toBe(false);
  });
});

describe('A4 golden — scoreProgram/explainProgram/scoredPrograms = легаси', () => {
  it('scoredPrograms (id + score) совпадает по всем сценариям', () => {
    for (const sc of SCENARIOS) {
      const mine = scoredPrograms(sc.answers).map((x) => [x.program.id, x.score]);
      const ref = legacy.scoredPrograms(sc.answers).map((x: { program: { id: string }; score: number }) => [x.program.id, x.score]);
      expect(mine, sc.name).toEqual(ref);
    }
  });

  it('explainProgram (полный объект) совпадает по сетке программа×сценарий', () => {
    for (const sc of SCENARIOS) {
      for (const p of PROGRAMS) {
        const mine = explainProgram(p, sc.answers);
        const ref = legacy.explainProgram(p, sc.answers);
        expect(mine, `${p.id} / ${sc.name}`).toEqual(ref);
      }
    }
  });

  it('scoreProgram совпадает на дополнительных наборах ответов', () => {
    const extra: Answers[] = [
      { purpose: 'working', sector: 'processing', experience: '3plus', location: 'regional-center', amount: '100-500m' },
      { purpose: 'investments', sector: 'animal', experience: '1-3', amount: '20-100m' },
      { purpose: 'livestock', sector: 'animal', experience: 'under-1', amount: 'under-20m', animalType: 'MRS', heads: 'under-100' },
      {}
    ];
    for (const ans of extra) {
      for (const p of PROGRAMS) {
        expect(scoreProgram(p, ans)).toBe(legacy.scoreProgram(p, ans));
      }
    }
  });
});
