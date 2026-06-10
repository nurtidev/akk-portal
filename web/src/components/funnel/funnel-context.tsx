'use client';

// =====================================================
// ===== B2/B7: FunnelProvider (context + useReducer) ==
// Единый стор воронки на весь поток. Переключение экранов — через screen
// в state (секции скрыты до своего шага), как showSection() в легаси.
//
// СТЫКОВКА С ТРЕКОМ D:
//  - submitApplication — реальная отправка заявки (POST /applications). Сейчас
//    мок-заглушка; трек D подключит свой колбэк через проп `submitApplication`.
//  - requireAuth — гейт авторизации перед визардом/подачей (опционально).
// =====================================================

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useReducer,
  type ReactNode,
} from 'react';
import {
  funnelReducer,
  initialFunnelState,
  type CalcEntry,
  type FunnelScreen,
  type FunnelState,
} from './funnel-state';
import { PROGRAMS, type Program } from '@/data/programs';
import { getQuestions, PURPOSE_TO_SECTOR, type QuestionKey } from '@/data/questions';
import { scoredPrograms } from '@/lib/scoring';
import { calculateStress } from '@/lib/stress';
import { effectiveMaxTerm, pickInitialTerm } from '@/lib/schedule';
import { track } from '@/lib/analytics';

/** Сводка заявки, передаваемая в submitApplication (стыковка с треком D). */
export interface ApplicationDraft {
  programId: string | null;
  amount: number;
  term: number;
  answers: FunnelState['answers'];
  callback: FunnelState['callback'];
  stressRatio: number | null;
}

/** Результат отправки заявки (трек D вернёт реальный номер). */
export interface SubmitResult {
  number: string;
}

/** Колбэк реальной отправки заявки — подключает трек D. */
export type SubmitApplication = (draft: ApplicationDraft) => Promise<SubmitResult>;

// Карта суммы из ответа квиза — defaultCalcAmount() из легаси (≈ строки 2877–2889).
const AMOUNT_MAP: Record<string, number> = {
  'under-20m': 20000000,
  '20-100m': 60000000,
  '100-500m': 300000000,
  '500m-plus': 1000000000,
};

function defaultCalcAmount(p: Program, answers: FunnelState['answers']): number {
  let v = answers.amount ? AMOUNT_MAP[answers.amount] : undefined;
  if (v == null) v = Math.round(p.maxAmount / 2);
  if (v > p.maxAmount) v = p.maxAmount;
  if (v < 100000) v = 100000;
  return v;
}

/** Стартовая запись калькулятора для программы (как renderResultCard в легаси). */
function makeCalcEntry(p: Program, answers: FunnelState['answers']): CalcEntry {
  const effMax = effectiveMaxTerm(p, answers);
  return {
    amount: defaultCalcAmount(p, answers),
    term: p.scheduleType === 'biannual_winter' ? effMax : pickInitialTerm(effMax),
  };
}

interface FunnelContextValue {
  state: FunnelState;
  // Навигация / квиз
  startQuiz: () => void;
  goToStep: (step: number) => void;
  /** Тихая установка шага (автопереход после выбора) — без события прыжка. */
  setStep: (step: number) => void;
  answer: (key: QuestionKey, value: string) => void;
  prevStep: () => void;
  showResults: () => void;
  reset: () => void;
  setScreen: (screen: FunnelScreen) => void;
  // Калькулятор
  /** Текущая запись калькулятора (из стора или вычисленная по умолчанию) — чистая, без записи в стор. */
  calcEntry: (id: string) => CalcEntry;
  /** Засеять/выровнять запись калькулятора в сторе (вызывать из эффекта, не в рендере). */
  seedCalc: (id: string) => void;
  setCalcAmount: (id: string, amount: number) => void;
  /** Зафиксировать сумму как «выбранную» — событие calculator_amount (commit, не каждый шаг). */
  commitCalcAmount: (id: string, amount: number) => void;
  setCalcTerm: (id: string, term: number) => void;
  // Подбор
  apply: (id: string) => void;
  applyDirect: (id: string) => void;
  openProgramDetail: (id: string) => void;
  requestConsultation: () => void;
  // Стресс-тест
  setStressField: (field: keyof FunnelState['stress'], value: string) => void;
  runStress: () => void;
  skipStress: () => void;
  // Подача
  showCallback: () => void;
  setCallback: (patch: Partial<FunnelState['callback']>) => void;
  submit: () => Promise<void>;
  // Вспомогательное
  maxReachableStep: () => number;
}

const FunnelContext = createContext<FunnelContextValue | null>(null);

// Мок-отправка по умолчанию: генерирует номер локально, реального POST нет.
// TODO(трек D): заменить на реальный POST /applications через проп submitApplication.
const mockSubmit: SubmitApplication = async () => {
  return { number: '№' + Math.floor(10000 + Math.random() * 90000) };
};

export interface FunnelProviderProps {
  children: ReactNode;
  /** Реальная отправка заявки — подключает трек D. По умолчанию мок. */
  submitApplication?: SubmitApplication;
}

export function FunnelProvider({ children, submitApplication }: FunnelProviderProps) {
  const [state, dispatch] = useReducer(funnelReducer, undefined, initialFunnelState);

  const startQuiz = useCallback(() => {
    track('quiz_started');
    dispatch({ type: 'START_QUIZ' });
  }, []);

  const maxReachableStep = useCallback((): number => {
    const qs = getQuestions(state.answers);
    for (let i = 0; i < qs.length; i++) {
      if (state.answers[qs[i].key] == null) return i;
    }
    return qs.length - 1;
  }, [state.answers]);

  const showResults = useCallback(() => {
    const scored = scoredPrograms(state.answers);
    track('results_viewed', {
      count: scored.length,
      top: scored[0] ? scored[0].program.id : null,
      top_score: scored[0] ? scored[0].score : null,
    });
    dispatch({ type: 'GO_RESULTS' });
  }, [state.answers]);

  const goToStep = useCallback(
    (target: number) => {
      track('quiz_step_jump', { from_step: state.step + 1, to_step: target + 1 });
      dispatch({ type: 'SET_STEP', step: target });
    },
    [state.step],
  );

  const setStep = useCallback((target: number) => {
    dispatch({ type: 'SET_STEP', step: target });
  }, []);

  const answer = useCallback(
    (key: QuestionKey, value: string) => {
      dispatch({ type: 'SET_ANSWER', key, value });
      // Авто-проставление отрасли, если цель её однозначно определяет (как в легаси).
      if (key === 'purpose' && PURPOSE_TO_SECTOR[value]) {
        dispatch({ type: 'SET_ANSWER', key: 'sector', value: PURPOSE_TO_SECTOR[value] });
      }
      track('quiz_answer', { question: key, answer: value, step: state.step + 1 });
    },
    [state.step],
  );

  const prevStep = useCallback(() => {
    if (state.step > 0) dispatch({ type: 'SET_STEP', step: state.step - 1 });
  }, [state.step]);

  const reset = useCallback(() => {
    track('flow_reset');
    dispatch({ type: 'RESET' });
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const setScreen = useCallback((screen: FunnelScreen) => {
    dispatch({ type: 'SET_SCREEN', screen });
  }, []);

  // Чистое чтение записи калькулятора (без записи в стор) — безопасно в рендере.
  // Если записи нет — вычисляет дефолт; если срок превысил потолок цели — выравнивает.
  const calcEntry = useCallback(
    (id: string): CalcEntry => {
      const p = PROGRAMS.find((x) => x.id === id);
      const existing = state.calc[id];
      if (existing) {
        if (p) {
          const effMax = effectiveMaxTerm(p, state.answers);
          if (existing.term > effMax) {
            return { ...existing, term: pickInitialTerm(effMax) };
          }
        }
        return existing;
      }
      if (!p) return { amount: 100000, term: 12 };
      return makeCalcEntry(p, state.answers);
    },
    [state.calc, state.answers],
  );

  // Засеять/выровнять запись в сторе — вызывать из эффекта, не в рендере.
  const seedCalc = useCallback(
    (id: string) => {
      const p = PROGRAMS.find((x) => x.id === id);
      if (!p) return;
      const existing = state.calc[id];
      if (!existing) {
        dispatch({ type: 'SET_CALC', id, entry: makeCalcEntry(p, state.answers) });
        return;
      }
      const effMax = effectiveMaxTerm(p, state.answers);
      if (existing.term > effMax) {
        dispatch({ type: 'SET_CALC', id, entry: { ...existing, term: pickInitialTerm(effMax) } });
      }
    },
    [state.calc, state.answers],
  );

  const setCalcAmount = useCallback((id: string, amount: number) => {
    dispatch({ type: 'SET_CALC_AMOUNT', id, amount });
  }, []);

  const commitCalcAmount = useCallback((id: string, amount: number) => {
    track('calculator_amount', { program: id, amount });
  }, []);

  const setCalcTerm = useCallback((id: string, term: number) => {
    dispatch({ type: 'SET_CALC_TERM', id, term });
    track('calculator_term', { program: id, term });
  }, []);

  // Переход к подаче: со стресс-тестом (Игілік/Береке) или сразу к визарду.
  const proceedToApply = useCallback((id: string) => {
    const p = PROGRAMS.find((x) => x.id === id);
    if (!p) return;
    if (p.hasStressTest) {
      track('stress_test_opened', { program: id });
      dispatch({ type: 'SET_SCREEN', screen: 'stress' });
    } else {
      track('callback_form_opened', { program: id });
      dispatch({ type: 'SET_SCREEN', screen: 'wizard' });
    }
  }, []);

  const apply = useCallback(
    (id: string) => {
      dispatch({ type: 'SELECT_PROGRAM', id });
      const prog = PROGRAMS.find((p) => p.id === id);
      const c = state.calc[id];
      track('apply_clicked', {
        program: id,
        score: prog ? (scoredPrograms(state.answers).find((s) => s.program.id === id)?.score ?? null) : null,
        amount: c ? c.amount : 0,
      });
      proceedToApply(id);
    },
    [state.calc, state.answers, proceedToApply],
  );

  // Прямая подача из модалки программы — без квиза (applyForProgram в легаси).
  const applyDirect = useCallback(
    (id: string) => {
      const p = PROGRAMS.find((x) => x.id === id);
      if (!p) return;
      dispatch({ type: 'SELECT_PROGRAM', id });
      if (!state.calc[id]) {
        dispatch({ type: 'SET_CALC', id, entry: makeCalcEntry(p, state.answers) });
      }
      track('apply_direct', { program: id });
      proceedToApply(id);
    },
    [state.calc, state.answers, proceedToApply],
  );

  const openProgramDetail = useCallback((id: string) => {
    track('program_detail_open', { id });
  }, []);

  const requestConsultation = useCallback(() => {
    dispatch({ type: 'SELECT_PROGRAM', id: null });
    track('consultation_requested');
    track('callback_form_opened', { program: null });
    dispatch({ type: 'SET_SCREEN', screen: 'wizard' });
  }, []);

  const setStressField = useCallback((field: keyof FunnelState['stress'], value: string) => {
    dispatch({ type: 'SET_STRESS_FIELD', field, value });
  }, []);

  const runStress = useCallback(() => {
    const id = state.selectedProgram;
    if (!id) return;
    const p = PROGRAMS.find((x) => x.id === id);
    const c = state.calc[id];
    if (!p || !c) return;
    const result = calculateStress(p, c, state.stress);
    dispatch({ type: 'SET_STRESS_RESULT', result });
    track('stress_test_completed', {
      program: id,
      animal_type: state.stress.animalType,
      ratio: Math.round(result.ratio),
      verdict: result.verdict.level,
      total_herd: result.totalHerd,
      has_existing_debts: result.existingDebtsYearly > 0,
    });
  }, [state.selectedProgram, state.calc, state.stress]);

  const skipStress = useCallback(() => {
    track('stress_test_skipped', { program: state.selectedProgram });
    dispatch({ type: 'SET_SCREEN', screen: 'wizard' });
  }, [state.selectedProgram]);

  const showCallback = useCallback(() => {
    track('callback_form_opened', { program: state.selectedProgram });
    dispatch({ type: 'SET_SCREEN', screen: 'wizard' });
  }, [state.selectedProgram]);

  const setCallback = useCallback((patch: Partial<FunnelState['callback']>) => {
    dispatch({ type: 'SET_CALLBACK', patch });
  }, []);

  const submit = useCallback(async () => {
    const id = state.selectedProgram;
    const c = id ? state.calc[id] : undefined;
    const draft: ApplicationDraft = {
      programId: id,
      amount: c ? c.amount : 0,
      term: c ? c.term : 0,
      answers: state.answers,
      callback: state.callback,
      stressRatio: state.stress.result ? Math.round(state.stress.result.ratio) : null,
    };
    // TODO(трек D): реальный POST /applications. Сейчас — submitApplication из
    // пропа (если подключён треком D) или мок-номер.
    const fn = submitApplication || mockSubmit;
    const res = await fn(draft);
    dispatch({ type: 'SET_LEAD_NUMBER', value: res.number });
    // Payload по таблице README: { program, channel, time }. В SMS-визарде нет
    // выбора времени звонка — time = null; lead_id оставляем как полезный контекст.
    track('lead_submitted', {
      program: id,
      channel: state.callback.channel,
      time: null,
      lead_id: res.number,
    });
    track('success_shown', { lead_id: res.number });
    dispatch({ type: 'SET_SCREEN', screen: 'success' });
  }, [state.selectedProgram, state.calc, state.answers, state.callback, state.stress.result, submitApplication]);

  const value = useMemo<FunnelContextValue>(
    () => ({
      state,
      startQuiz,
      goToStep,
      setStep,
      answer,
      prevStep,
      showResults,
      reset,
      setScreen,
      calcEntry,
      seedCalc,
      setCalcAmount,
      commitCalcAmount,
      setCalcTerm,
      apply,
      applyDirect,
      openProgramDetail,
      requestConsultation,
      setStressField,
      runStress,
      skipStress,
      showCallback,
      setCallback,
      submit,
      maxReachableStep,
    }),
    [
      state,
      startQuiz,
      goToStep,
      setStep,
      answer,
      prevStep,
      showResults,
      reset,
      setScreen,
      calcEntry,
      seedCalc,
      setCalcAmount,
      commitCalcAmount,
      setCalcTerm,
      apply,
      applyDirect,
      openProgramDetail,
      requestConsultation,
      setStressField,
      runStress,
      skipStress,
      showCallback,
      setCallback,
      submit,
      maxReachableStep,
    ],
  );

  return <FunnelContext.Provider value={value}>{children}</FunnelContext.Provider>;
}

export function useFunnel(): FunnelContextValue {
  const ctx = useContext(FunnelContext);
  if (!ctx) throw new Error('useFunnel must be used within FunnelProvider');
  return ctx;
}
