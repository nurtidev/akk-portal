// =====================================================
// ===== G16: мок-данные персон для демо АгроСкора ====
// Данные СИНТЕТИЧЕСКИЕ — реальных ИИН нет.
// =====================================================

export interface LandPlot {
  hectares: number;
  category: 'пашня' | 'пастбище';
  right: 'собственность' | 'аренда';
}

export interface LivestockItem {
  type: 'КРС' | 'МРС' | 'лошади';
  count: number;
}

export interface SubsidyRecord {
  year: number;
  type: string;
  amount_tg: number;
}

export interface CreditBureauData {
  current_debt_tg: number;
  open_loans: number;
  overdue_count: number;
  had_default: boolean;
}

export interface TaxData {
  regime: 'ЕСХН' | 'общий';
  annual_turnover_tg: number;
}

export interface PensionData {
  has_contributions: boolean;
  hired_workers: number;
}

export interface ClimateData {
  drought_risk: 'низкий' | 'средний' | 'высокий';
  ndvi: number;
}

export interface AkkHistory {
  total_loans: number;
  repaid_without_delay: number;
  current_loans: number;
  had_overdue: boolean;
}

export interface AgroPersona {
  profile: { iin: string; name: string; age: number; region: string };
  land: LandPlot[];
  livestock: LivestockItem[];
  subsidies: SubsidyRecord[];
  creditBureau: CreditBureauData;
  tax: TaxData;
  pension: PensionData;
  climate: ClimateData;
  akkHistory: AkkHistory;
}

// Персона 1 — ОБРАЗЦОВЫЙ (ожидаемый рейтинг A)
const persona1: AgroPersona = {
  profile: {
    iin: '830512300147',
    name: 'Айбек Сейтов',
    age: 42,
    region: 'Алматинская обл.',
  },
  land: [
    { hectares: 350, category: 'пашня', right: 'собственность' },
    { hectares: 120, category: 'пастбище', right: 'аренда' },
  ],
  livestock: [
    { type: 'КРС', count: 85 },
    { type: 'лошади', count: 30 },
  ],
  subsidies: [
    { year: 2022, type: 'субсидирование семян', amount_tg: 1_200_000 },
    { year: 2023, type: 'субсидирование удобрений', amount_tg: 980_000 },
    { year: 2024, type: 'субсидирование семян', amount_tg: 1_450_000 },
  ],
  creditBureau: {
    current_debt_tg: 4_500_000,
    open_loans: 1,
    overdue_count: 0,
    had_default: false,
  },
  tax: { regime: 'ЕСХН', annual_turnover_tg: 28_000_000 },
  pension: { has_contributions: true, hired_workers: 7 },
  climate: { drought_risk: 'низкий', ndvi: 0.72 },
  akkHistory: {
    total_loans: 3,
    repaid_without_delay: 3,
    current_loans: 0,
    had_overdue: false,
  },
};

// Персона 2 — НОВИЧОК / thin file (ожидаемый рейтинг B/C)
const persona2: AgroPersona = {
  profile: {
    iin: '951203400268',
    name: 'Гүлнар Бекова',
    age: 30,
    region: 'Акмолинская обл.',
  },
  land: [{ hectares: 80, category: 'пашня', right: 'аренда' }],
  livestock: [{ type: 'МРС', count: 25 }],
  subsidies: [
    { year: 2024, type: 'субсидирование семян', amount_tg: 320_000 },
  ],
  creditBureau: {
    current_debt_tg: 1_200_000,
    open_loans: 1,
    overdue_count: 0,
    had_default: false,
  },
  tax: { regime: 'ЕСХН', annual_turnover_tg: 5_800_000 },
  pension: { has_contributions: false, hired_workers: 0 },
  climate: { drought_risk: 'средний', ndvi: 0.48 },
  akkHistory: {
    total_loans: 0,
    repaid_without_delay: 0,
    current_loans: 0,
    had_overdue: false,
  },
};

// Персона 3 — РИСКОВЫЙ (ожидаемый рейтинг D)
const persona3: AgroPersona = {
  profile: {
    iin: '780904100385',
    name: 'Марат Джаксыбеков',
    age: 45,
    region: 'Мангистауская обл.',
  },
  land: [{ hectares: 40, category: 'пастбище', right: 'аренда' }],
  livestock: [{ type: 'МРС', count: 15 }],
  subsidies: [],
  creditBureau: {
    current_debt_tg: 18_500_000,
    open_loans: 3,
    overdue_count: 4,
    had_default: true,
  },
  tax: { regime: 'общий', annual_turnover_tg: 3_200_000 },
  pension: { has_contributions: false, hired_workers: 0 },
  climate: { drought_risk: 'высокий', ndvi: 0.21 },
  akkHistory: {
    total_loans: 1,
    repaid_without_delay: 0,
    current_loans: 1,
    had_overdue: true,
  },
};

export const AGRO_PERSONAS: AgroPersona[] = [persona1, persona2, persona3];

export const DEMO_IINS: string[] = [
  persona1.profile.iin,
  persona2.profile.iin,
  persona3.profile.iin,
];

export function findPersonaByIin(iin: string): AgroPersona | null {
  return AGRO_PERSONAS.find((p) => p.profile.iin === iin) ?? null;
}
