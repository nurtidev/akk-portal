// =====================================================
// ===== A2: QUESTIONS + условные вопросы + getQuestions
// Перенос 1-в-1 из index.html (≈ строки 2659–2746, 2898–2938).
// =====================================================

import type { QuestionKey } from './programs';

export type { QuestionKey };

export interface QuestionOption {
  value: string;
  label: string;
  /** (опц.) подзаголовок-пояснение варианта. */
  desc?: string;
}

export interface Question {
  key: QuestionKey;
  /** Короткое имя для бейджей/прогресса. */
  short: string;
  title: string;
  /** (опц.) подсказка под заголовком. */
  hint?: string;
  options: QuestionOption[];
}

/** Срез ответов пользователя по ключам вопросов. */
export type Answers = Partial<Record<QuestionKey, string | null>>;

export const QUESTIONS: Question[] = [
  { key: 'purpose', short: 'Цель', title: 'Что хотите профинансировать?', hint: 'Выберите основную цель кредита',
    options: [
      { value: 'vprir', label: 'Весенне-полевые и уборочные работы', desc: 'ВПРиУР: семена, ГСМ, удобрения, средства защиты' },
      { value: 'livestock', label: 'Покупка скота', desc: 'КРС, МРС, лошади, верблюды — племенной или товарный' },
      { value: 'feedlot', label: 'Откорм или птицеводство', desc: 'Откормочные площадки, птицефабрики' },
      { value: 'investments', label: 'Инвестиции, покупка основных средств', desc: 'Оборудование, техника, СМР, расширение' },
      { value: 'working', label: 'Пополнение оборотных средств', desc: 'ПОС: сырьё, переработка, межсезонье' },
      { value: 'micro', label: 'Микрокредит, стартап', desc: 'Небольшая сумма до 35 млн ₸' }
    ]
  },
  { key: 'sector', short: 'Отрасль', title: 'Ваша основная отрасль?',
    options: [
      { value: 'plant', label: 'Растениеводство' },
      { value: 'animal', label: 'Животноводство' },
      { value: 'poultry', label: 'Птицеводство или откорм' },
      { value: 'processing', label: 'Переработка сельхозпродукции' },
      { value: 'services', label: 'Услуги, торговля, прочее' }
    ]
  },
  { key: 'experience', short: 'Опыт', title: 'Сколько лет ведёте деятельность?',
    options: [
      { value: 'startup', label: 'Только открываюсь' },
      { value: 'under-1', label: 'До 1 года' },
      { value: '1-3', label: '1 – 3 года' },
      { value: '3plus', label: 'Более 3 лет' }
    ]
  },
  { key: 'location', short: 'Регион', title: 'Где находитесь?',
    options: [
      { value: 'village', label: 'Село' },
      { value: 'small-town', label: 'Малый город (до 50 тыс. жителей)' },
      { value: 'regional-center', label: 'Областной центр' },
      { value: 'metro', label: 'Алматы, Астана, Шымкент, Актау, Атырау' }
    ]
  },
  { key: 'amount', short: 'Сумма', title: 'Какая сумма нужна?',
    options: [
      { value: 'under-20m', label: 'До 20 млн ₸' },
      { value: '20-100m', label: '20 – 100 млн ₸' },
      { value: '100-500m', label: '100 – 500 млн ₸' },
      { value: '500m-plus', label: 'Более 500 млн ₸' }
    ]
  }
];

export const ANIMAL_TYPE_Q: Question = {
  key: 'animalType', short: 'Вид', title: 'Какой вид животных планируете приобрести?',
  hint: 'Влияет на подбор программы и нормативы стресс-теста',
  options: [
    { value: 'KRS', label: 'КРС', desc: 'Крупный рогатый скот — мясное или молочное направление' },
    { value: 'MRS', label: 'МРС', desc: 'Мелкий рогатый скот — овцы, козы' },
    { value: 'HORSE', label: 'Лошади', desc: 'Коневодство' },
    { value: 'CAMEL', label: 'Верблюды', desc: 'Верблюдоводство' }
  ]
};

export const HEADS_Q: Question = {
  key: 'heads', short: 'Головы', title: 'Сколько голов планируете приобрести?',
  options: [
    { value: 'under-100', label: 'До 100 голов' },
    { value: '100-499', label: '100 – 499 голов' },
    { value: '500plus', label: '500 голов и более' }
  ]
};

// purpose → автоматически определяемая отрасль (sector). Если совпадает — вопрос про sector скрываем.
export const PURPOSE_TO_SECTOR: Record<string, string> = {
  vprir: 'plant',
  livestock: 'animal',
  feedlot: 'poultry'
};

// Вопрос о регионе влияет на подбор только для этих целей (бонус «село / малый
// город» есть только у Іскер). Для остальных целей шаг скрываем как лишний.
export const REGION_PURPOSES: string[] = ['feedlot', 'working', 'micro'];

/**
 * Список вопросов квиза для текущих ответов. Условные ветки:
 *  - sector скрыт, если отрасль вытекает из цели (PURPOSE_TO_SECTOR);
 *  - location скрыт, если для цели регион не влияет (REGION_PURPOSES);
 *  - purpose=livestock → добавляется вид животных (+ количество голов).
 * Реальное число шагов: 5 / 6 (покупка скота).
 * (Вопрос импорт/отечественный убран: по 002-207-22 Игілік/Береке финансируют
 *  и импортный, и отечественный племенной КРС.)
 */
export function getQuestions(answers: Answers): Question[] {
  const purpose = answers.purpose;
  const base = QUESTIONS.filter(function (q) {
    if (q.key === 'sector') return !purpose || !PURPOSE_TO_SECTOR[purpose];
    if (q.key === 'location') return !purpose || REGION_PURPOSES.includes(purpose);
    return true;
  });
  // Для покупки скота — добавляем вид животных и количество голов.
  if (purpose === 'livestock') {
    const livestockQs: Question[] = [ANIMAL_TYPE_Q, HEADS_Q];
    return base.concat(livestockQs);
  }
  return base;
}

// Все вопросы квиза в одном списке — для человекочитаемых пояснений подбора.
export const ALL_QUESTIONS: Question[] = QUESTIONS.concat([ANIMAL_TYPE_Q, HEADS_Q]);

export function questionByKey(key: QuestionKey | string): Question | null {
  for (let i = 0; i < ALL_QUESTIONS.length; i++) {
    if (ALL_QUESTIONS[i].key === key) return ALL_QUESTIONS[i];
  }
  return null;
}

/** Подпись варианта ответа («livestock» → «Покупка скота»). */
export function optionLabel(key: QuestionKey | string, value: string): string {
  const q = questionByKey(key);
  if (!q) return value;
  for (let i = 0; i < q.options.length; i++) {
    if (q.options[i].value === value) return q.options[i].label;
  }
  return value;
}

/** Короткое имя вопроса для бейджей («animalType» → «Вид»). */
export function questionShort(key: QuestionKey | string): string {
  const q = questionByKey(key);
  return q ? q.short : (key as string);
}
