import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import {
  QUESTIONS,
  ANIMAL_TYPE_Q,
  CATTLE_ORIGIN_Q,
  HEADS_Q,
  getQuestions,
  optionLabel,
  questionShort,
  type Answers
} from '@/data/questions';

const require = createRequire(import.meta.url);
const legacy = require('./fixtures/legacy.cjs');

describe('A2 QUESTIONS — структура', () => {
  it('5 базовых вопросов в нужном порядке', () => {
    expect(QUESTIONS.map((q) => q.key)).toEqual([
      'purpose',
      'sector',
      'experience',
      'location',
      'amount'
    ]);
  });

  it('условные вопросы заданы', () => {
    expect(ANIMAL_TYPE_Q.key).toBe('animalType');
    expect(CATTLE_ORIGIN_Q.key).toBe('cattleOrigin');
    expect(HEADS_Q.key).toBe('heads');
    expect(ANIMAL_TYPE_Q.options.map((o) => o.value)).toEqual(['KRS', 'MRS', 'HORSE', 'CAMEL']);
    expect(HEADS_Q.options.map((o) => o.value)).toEqual(['under-100', '100-499', '500plus']);
  });
});

describe('A2 getQuestions — ветвление 5/6/7 шагов', () => {
  it('пусто/растениеводство (vprir): скрыт sector+location → 4 шага', () => {
    const qs = getQuestions({ purpose: 'vprir' });
    expect(qs.map((q) => q.key)).toEqual(['purpose', 'experience', 'amount']);
  });

  it('investments: sector показан (не выводится из цели), location скрыт', () => {
    const qs = getQuestions({ purpose: 'investments' });
    expect(qs.map((q) => q.key)).toEqual(['purpose', 'sector', 'experience', 'amount']);
  });

  it('micro: location показан (REGION_PURPOSES) → 5 шагов', () => {
    const qs = getQuestions({ purpose: 'micro' });
    expect(qs.map((q) => q.key)).toEqual(['purpose', 'sector', 'experience', 'location', 'amount']);
  });

  it('livestock без КРС → 6 шагов (вид + головы, без cattleOrigin)', () => {
    const qs = getQuestions({ purpose: 'livestock', animalType: 'MRS' });
    expect(qs.map((q) => q.key)).toEqual(['purpose', 'experience', 'amount', 'animalType', 'heads']);
  });

  it('livestock + КРС → 7 шагов (вид + cattleOrigin + головы)', () => {
    const qs = getQuestions({ purpose: 'livestock', animalType: 'KRS' });
    expect(qs.map((q) => q.key)).toEqual([
      'purpose',
      'experience',
      'amount',
      'animalType',
      'cattleOrigin',
      'heads'
    ]);
  });

  it('livestock без выбранного вида → вид + головы, ещё без cattleOrigin', () => {
    const qs = getQuestions({ purpose: 'livestock' });
    expect(qs.map((q) => q.key)).toEqual(['purpose', 'experience', 'amount', 'animalType', 'heads']);
  });
});

describe('A2 optionLabel / questionShort', () => {
  it('optionLabel переводит value в подпись', () => {
    expect(optionLabel('purpose', 'livestock')).toBe('Покупка скота');
    expect(optionLabel('animalType', 'KRS')).toBe('КРС');
    expect(optionLabel('experience', '1-3')).toBe('1 – 3 года');
  });

  it('optionLabel возвращает value при незнакомом ключе/значении', () => {
    expect(optionLabel('purpose', 'unknown')).toBe('unknown');
    expect(optionLabel('nope', 'x')).toBe('x');
  });

  it('questionShort даёт короткое имя', () => {
    expect(questionShort('animalType')).toBe('Вид');
    expect(questionShort('amount')).toBe('Сумма');
    expect(questionShort('nope')).toBe('nope');
  });
});

describe('A2 golden — getQuestions/optionLabel/questionShort = легаси', () => {
  const cases: Answers[] = [
    {},
    { purpose: 'vprir' },
    { purpose: 'investments' },
    { purpose: 'working' },
    { purpose: 'micro' },
    { purpose: 'feedlot' },
    { purpose: 'livestock' },
    { purpose: 'livestock', animalType: 'KRS' },
    { purpose: 'livestock', animalType: 'MRS' },
    { purpose: 'livestock', animalType: 'HORSE' },
    { purpose: 'livestock', animalType: 'CAMEL' }
  ];

  it('последовательность ключей вопросов совпадает', () => {
    for (const ans of cases) {
      const mine = getQuestions(ans).map((q) => q.key);
      const ref = legacy.getQuestions(ans).map((q: { key: string }) => q.key);
      expect(mine, JSON.stringify(ans)).toEqual(ref);
    }
  });

  it('optionLabel/questionShort совпадают по всем вариантам', () => {
    const keys = ['purpose', 'sector', 'experience', 'location', 'amount', 'animalType', 'cattleOrigin', 'heads'];
    for (const k of keys) {
      expect(questionShort(k)).toBe(legacy.questionShort(k));
    }
    for (const q of QUESTIONS.concat([ANIMAL_TYPE_Q, CATTLE_ORIGIN_Q, HEADS_Q])) {
      for (const o of q.options) {
        expect(optionLabel(q.key, o.value)).toBe(legacy.optionLabel(q.key, o.value));
      }
    }
  });
});
