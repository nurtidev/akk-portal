// =====================================================
// ===== B2: единый стор воронки (state + reducer) =====
// Форма state — по легаси (index.html ≈ 2817–2828):
//   screen / step / answers / selectedProgram / calc / stress / callback.
// Единый стор (а не несколько) — инвариант CLAUDE.md.
// =====================================================

import type { Answers, QuestionKey } from '@/data/questions';
import type { StressResult } from '@/lib/stress';

/** Экран воронки. landing — лендинг (hero+programs), дальше — шаги. */
export type FunnelScreen =
  | 'landing'
  | 'quiz'
  | 'results'
  | 'stress'
  | 'callback'
  | 'wizard'
  | 'success';

/** Параметры калькулятора по программе. */
export interface CalcEntry {
  amount: number;
  term: number;
}

/** Поля ввода стресс-теста (строки — как в легаси, Number() при расчёте). */
export interface StressState {
  animalType: string;
  existingHerd: string;
  plannedHerd: string;
  pasturesHa: string;
  barnSqm: string;
  existingDebtsMonthly: string;
  annualRevenue: string;
  result: StressResult | null;
}

/** Контакты заявителя (для мок-визарда подачи). */
export interface CallbackState {
  name: string;
  phone: string; // только цифры
  channel: 'call' | 'whatsapp' | 'telegram';
}

export interface FunnelState {
  screen: FunnelScreen;
  step: number;
  answers: Answers;
  selectedProgram: string | null;
  calc: Record<string, CalcEntry>;
  stress: StressState;
  callback: CallbackState;
  /** Номер поданной заявки (мок) — для экрана успеха. */
  leadNumber: string | null;
}

export const EMPTY_ANSWERS: Answers = {
  purpose: null,
  sector: null,
  experience: null,
  location: null,
  amount: null,
  animalType: null,
  cattleOrigin: null,
  heads: null,
};

function emptyStress(): StressState {
  return {
    animalType: 'KRS',
    existingHerd: '',
    plannedHerd: '',
    pasturesHa: '',
    barnSqm: '',
    existingDebtsMonthly: '',
    annualRevenue: '',
    result: null,
  };
}

export function initialFunnelState(): FunnelState {
  return {
    screen: 'landing',
    step: 0,
    answers: { ...EMPTY_ANSWERS },
    selectedProgram: null,
    calc: {},
    stress: emptyStress(),
    callback: { name: '', phone: '', channel: 'call' },
    leadNumber: null,
  };
}

// =====================================================
// ===== Actions =======================================
// =====================================================
export type FunnelAction =
  | { type: 'START_QUIZ' }
  | { type: 'SET_STEP'; step: number }
  | { type: 'SET_ANSWER'; key: QuestionKey; value: string }
  | { type: 'GO_RESULTS' }
  | { type: 'SET_SCREEN'; screen: FunnelScreen }
  | { type: 'SELECT_PROGRAM'; id: string | null }
  | { type: 'SET_CALC'; id: string; entry: CalcEntry }
  | { type: 'SET_CALC_AMOUNT'; id: string; amount: number }
  | { type: 'SET_CALC_TERM'; id: string; term: number }
  | { type: 'SET_STRESS_FIELD'; field: keyof StressState; value: string }
  | { type: 'SET_STRESS_RESULT'; result: StressResult | null }
  | { type: 'SET_CALLBACK'; patch: Partial<CallbackState> }
  | { type: 'SET_LEAD_NUMBER'; value: string | null }
  | { type: 'RESET' };

export function funnelReducer(state: FunnelState, action: FunnelAction): FunnelState {
  switch (action.type) {
    case 'START_QUIZ':
      // Сброс ответов и шага, как startQuiz() в легаси.
      return {
        ...state,
        screen: 'quiz',
        step: 0,
        answers: { ...EMPTY_ANSWERS },
      };
    case 'SET_STEP':
      return { ...state, step: action.step };
    case 'SET_ANSWER': {
      const answers = { ...state.answers, [action.key]: action.value };
      // Если выбран вид животных — пробрасываем его в стресс-тест (как в легаси).
      let stress = state.stress;
      if (action.key === 'animalType') {
        stress = { ...state.stress, animalType: action.value };
      }
      return { ...state, answers, stress };
    }
    case 'GO_RESULTS':
      return { ...state, screen: 'results' };
    case 'SET_SCREEN':
      return { ...state, screen: action.screen };
    case 'SELECT_PROGRAM':
      return { ...state, selectedProgram: action.id };
    case 'SET_CALC':
      return { ...state, calc: { ...state.calc, [action.id]: action.entry } };
    case 'SET_CALC_AMOUNT': {
      const prev = state.calc[action.id];
      if (!prev) return state;
      return { ...state, calc: { ...state.calc, [action.id]: { ...prev, amount: action.amount } } };
    }
    case 'SET_CALC_TERM': {
      const prev = state.calc[action.id];
      if (!prev) return state;
      return { ...state, calc: { ...state.calc, [action.id]: { ...prev, term: action.term } } };
    }
    case 'SET_STRESS_FIELD':
      return { ...state, stress: { ...state.stress, [action.field]: action.value } };
    case 'SET_STRESS_RESULT':
      return { ...state, stress: { ...state.stress, result: action.result } };
    case 'SET_CALLBACK':
      return { ...state, callback: { ...state.callback, ...action.patch } };
    case 'SET_LEAD_NUMBER':
      return { ...state, leadNumber: action.value };
    case 'RESET':
      return initialFunnelState();
    default:
      return state;
  }
}
